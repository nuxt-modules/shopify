import type { ShopifyRouteHandler, ShopifyRouteHandlerGroup } from '@shopify/hydrogen'
import type { CustomerSession, WritableCustomerSessionManager } from '@shopify/hydrogen/customer-account'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../../module'

import { createCartServerHandlers, createShopifyRouteHandler } from '@shopify/hydrogen'
import { createCustomerAccountServerHandlers } from '@shopify/hydrogen/customer-account'
import { useNitroApp } from 'nitropack/runtime'
import { withQuery } from 'ufo'

import { createLogger } from '../log'
import { isCartEndpoint } from '../routes'
import { createCustomerSessionManager, getHydrogenCustomerSession, requireCustomerAccountConfig } from './session'

type CustomerAccountHandlers = Record<'login' | 'authorize' | 'refresh' | 'logout', ShopifyRouteHandler>

type CustomerAccountRoutes = {
  handlers: ShopifyRouteHandlerGroup[]
  sessionManager: WritableCustomerSessionManager
}

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

function createHandlers(event: H3Event, config: ShopifyConfig) {
  const { afterLogin, afterLogout } = requireCustomerAccountConfig(config)

  const customerSession = getHydrogenCustomerSession(config)

  const redirects = {
    defaultPostLoginRedirectPathname: afterLogin,
    loginFailedRedirectPath: withQuery(afterLogin, { login: 'failed' }),
    postLogoutRedirectUri: afterLogout,
  }

  if (import.meta.dev) {
    return [
      createCartServerHandlers(config.cart ?? {}),
      withAuthHooks(event, customerSession, createCustomerAccountServerHandlers({ customerSession, ...redirects })),
    ]
  }

  const cartServerHandlers = createCartServerHandlers({ ...config.cart, customerSession })

  return [
    { ...cartServerHandlers, post: withAccessTokenCheck(customerSession, cartServerHandlers.post, callRefreshHook(event)) },
    withAuthHooks(event, customerSession, createCustomerAccountServerHandlers({ customerSession, cartServerHandlers, ...redirects })),
  ]
}

export function createCustomerAccountRoutes(event: H3Event, config: ShopifyConfig, pathname: string): CustomerAccountRoutes | undefined {
  try {
    return { handlers: createHandlers(event, config), sessionManager: createCustomerSessionManager(event) }
  }
  catch (error) {
    if (!customerAccountFailureLogged) {
      customerAccountFailureLogged = true

      createLogger().error('The customer account client is misconfigured: sign-in fails, and the cart runs without the customer session', error)
    }

    if (!isCartEndpoint(pathname)) throw error
  }
}
