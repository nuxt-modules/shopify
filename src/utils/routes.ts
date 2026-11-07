import { addServerHandler, extendRouteRules } from '@nuxt/kit'
import {
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
} from '@shopify/hydrogen/customer-account'

type RouteHandler = Parameters<typeof addServerHandler>[0] & { route: string }

export const STOREFRONT_ROUTES = [
  '/api/cart',
  '/api/predictive-search',
  '/api/*/graphql.json',
  '/api/mcp',
  '/api/ucp/mcp',
  '/checkout',
  '/cart.js',
  '/cart.json',
  '/cart/*',
  '/*/cart.js',
  '/*/cart.json',
  '/*/cart/*',
  '/buy/*',
  '/__shopify/api/collect',
  '/.well-known/ucp',
  '/.well-known/apple-developer-merchantid-domain-association',
  '/.well-known/shopify/fec/produce',
]

export const CUSTOMER_ACCOUNT_ROUTES = [
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
]

export function keepUncached(route: string) {
  extendRouteRules(route, { cache: false, swr: false, isr: false }, { override: true })
}

export function addUncachedServerHandler(handler: RouteHandler) {
  addServerHandler(handler)

  keepUncached(handler.route)
}
