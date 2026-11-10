import type { ShopifyRouteHandler, ShopifyRouteHandlerContext, ShopifyRouteTemplates } from '@shopify/hydrogen'
import type { CustomerSession } from '@shopify/hydrogen/customer-account'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../../module'

import { createCartServerHandlers, createShopifyRouteHandler, handleShopifyRoutes } from '@shopify/hydrogen'
import { createCustomerAccountServerHandlers } from '@shopify/hydrogen/customer-account'
import { useNitroApp } from 'nitropack/runtime'
import { withQuery } from 'ufo'

import { createLogger } from '../log'
import { isCartEndpoint } from '../routes'
import { createCustomerSessionManager, getHydrogenCustomerSession, requireCustomerAccountConfig } from './session'

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

  const customerSession = getHydrogenCustomerSession(config)
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

export function handleCustomerAccountOrCartRoutes(event: H3Event, config: ShopifyConfig, routes: ShopifyRoutes, pathname: string) {
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
