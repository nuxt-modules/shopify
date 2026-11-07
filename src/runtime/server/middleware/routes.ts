import type { ShopifyRouteHandler, ShopifyRouteHandlerContext, ShopifyRouteTemplates } from '@shopify/hydrogen'
import type { CustomerSession } from '@shopify/hydrogen/customer-account'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../module'

import { createCartServerHandlers, createPredictiveSearchServerHandlers, createShopifyRouteHandler, handleShopifyRoutes } from '@shopify/hydrogen'
import { createCustomerAccountServerHandlers } from '@shopify/hydrogen/customer-account'
import { defineEventHandler, getRequestURL, sendWebResponse } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { withQuery } from 'ufo'

import { useRuntimeConfig } from '#imports'
import { assertSameSite } from '../utils/csrf'
import { customerAccountContext } from '../utils/customer-account/auth'
import { createCustomerSessionManager, getCustomerSession, requireCustomerAccountConfig } from '../utils/customer-account/session'
import { createLogger } from '../utils/log'
import {
  applyShopifyResponseHeaders,
  createShopifyStorefrontClient,
  getShopifyRedirect,
  getShopifyRequestContext,
  isCartEndpoint,
  isCustomerAccountEndpoint,
  isShopifyApiProxyPath,
  isShopifyEndpoint,
  resolveShopifyScripts,
  toShopifyRequest,
} from '../utils/routes'

type ShopifyRoutes = Omit<ShopifyRouteHandlerContext, 'sessionManager'> & { routeTemplates: ShopifyRouteTemplates }

type CustomerAccountHandlers = Record<'login' | 'authorize' | 'refresh' | 'logout', ShopifyRouteHandler>

let customerAccountFailureLogged = false

function withAccessTokenCheck(customerSession: CustomerSession, handler: ShopifyRouteHandler, after: (renewed: boolean) => Promise<unknown>) {
  return createShopifyRouteHandler(handler.pathname, handler.method, async (context) => {
    const previous = await customerSession.getAccessToken(context.sessionManager, context.requestContext)

    try {
      return await handler(context)
    }
    finally {
      const current = await customerSession.getAccessToken(context.sessionManager, context.requestContext)

      await after(!!current && current !== previous)
    }
  })
}

function callRefreshHook(event: H3Event) {
  return async (refreshed: boolean) => {
    if (refreshed) await useNitroApp().hooks.callHook('shopify:customer-account:auth:refresh', { event })
  }
}

function withAuthHooks(event: H3Event, customerSession: CustomerSession, { authorize, refresh, logout, ...handlers }: CustomerAccountHandlers) {
  const { hooks } = useNitroApp()

  return {
    ...handlers,

    authorize: withAccessTokenCheck(customerSession, authorize, signedIn =>
      hooks.callHook(signedIn ? 'shopify:customer-account:auth:success' : 'shopify:customer-account:auth:error', { event })),

    refresh: withAccessTokenCheck(customerSession, refresh, callRefreshHook(event)),

    logout: createShopifyRouteHandler(logout.pathname, logout.method, async (context) => {
      const signedIn = await customerSession.isLoggedIn(context.sessionManager, context.requestContext)
      const result = await logout(context)

      if (signedIn && result.type === 'redirect') await hooks.callHook('shopify:customer-account:auth:logout', { event })

      return result
    }),
  }
}

function handleCustomerAccountRoutes(event: H3Event, config: ShopifyConfig, routes: ShopifyRoutes) {
  const { afterLogin, afterLogout } = requireCustomerAccountConfig(config)

  const customerSession = getCustomerSession(config)
  const sessionManager = createCustomerSessionManager(event)

  const redirects = {
    defaultPostLoginRedirectPathname: afterLogin,
    loginFailedRedirectPath: withQuery(afterLogin, { login: 'failed' }),
    postLogoutRedirectUri: afterLogout,
  }

  if (import.meta.dev) {
    return handleShopifyRoutes({
      ...routes,
      sessionManager,
      handlers: [
        createCartServerHandlers(config.cart ?? {}),
        withAuthHooks(event, customerSession, createCustomerAccountServerHandlers({ customerSession, ...redirects })),
      ],
    })
  }

  const syncedCartServerHandlers = createCartServerHandlers({ ...config.cart, customerSession })

  return handleShopifyRoutes({
    ...routes,
    sessionManager,
    handlers: [
      { ...syncedCartServerHandlers, post: withAccessTokenCheck(customerSession, syncedCartServerHandlers.post, callRefreshHook(event)) },
      withAuthHooks(event, customerSession, createCustomerAccountServerHandlers({ customerSession, cartServerHandlers: syncedCartServerHandlers, ...redirects })),
    ],
  })
}

function handleCustomerAccountOrCartRoutes(event: H3Event, config: ShopifyConfig, routes: ShopifyRoutes, pathname: string) {
  try {
    return handleCustomerAccountRoutes(event, config, routes)
  }
  catch (error) {
    if (!customerAccountFailureLogged) {
      customerAccountFailureLogged = true

      createLogger().error('The customer account client is misconfigured: sign-in fails, and the cart runs without the customer session', error)
    }

    if (!isCartEndpoint(pathname)) throw error

    return handleShopifyRoutes({ ...routes, handlers: [createCartServerHandlers(config.cart ?? {})] })
  }
}

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!_shopify) return

  const storefront = !!(_shopify.clients.storefront || _shopify.analytics)
  const customerAccount = !!_shopify.clients.customerAccount

  if (storefront) {
    event.context.shopifyRedirect = getShopifyRedirect
    event.context.shopifyScripts = resolveShopifyScripts
  }

  if (customerAccount) event.context.shopifyCustomerAccount = customerAccountContext

  const { pathname, searchParams } = getRequestURL(event)

  const shopifyEndpoint = isShopifyEndpoint(pathname, { storefront, customerAccount })
  const variantLink = storefront && searchParams.has('variant') && (event.method === 'GET' || event.method === 'HEAD')

  if (!shopifyEndpoint && !variantLink) return

  if (isShopifyApiProxyPath(pathname) && (!shopifyEndpoint || event.method !== 'POST')) return

  if (isCartEndpoint(pathname) && event.method !== 'GET' && event.method !== 'HEAD') assertSameSite(event)

  const requestContext = shopifyEndpoint
    ? await getShopifyRequestContext(event)
    : await getShopifyRequestContext(event).catch(() => undefined)

  if (!requestContext) return

  const routes = {
    request: toShopifyRequest(event, _shopify.clients.storefront?.publicAccessToken || undefined),
    requestContext,
    storefrontClient: createShopifyStorefrontClient(requestContext, _shopify),
    routeTemplates: _shopify.routeTemplates,
  }

  const response = customerAccount && (isCartEndpoint(pathname) || isCustomerAccountEndpoint(pathname))
    ? handleCustomerAccountOrCartRoutes(event, _shopify, routes, pathname)
    : handleShopifyRoutes({ ...routes, handlers: [createCartServerHandlers(_shopify.cart ?? {}), createPredictiveSearchServerHandlers(_shopify.predictiveSearch ?? {})] })

  if (!response) return

  const result = await response

  const cacheControl = result.headers.get('cache-control')

  if (!cacheControl || /\b(?:private|no-store)\b/.test(cacheControl)) {
    requestContext.markResponseAsPersonalized('shopify route')
    applyShopifyResponseHeaders(event, result)
  }

  return sendWebResponse(event, result)
})
