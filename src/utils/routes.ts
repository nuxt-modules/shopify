import { addServerHandler, extendRouteRules } from '@nuxt/kit'

type RouteHandler = Parameters<typeof addServerHandler>[0] & { route: string }

export const STOREFRONT_ROUTES = [
  '/api/cart',
  '/api/predictive-search',
  '/api/:version/graphql.json',
  '/api/mcp',
  '/api/ucp/mcp',
  '/checkout',
  '/cart.js',
  '/cart.json',
  '/cart/:path',
  '/:locale/cart.js',
  '/:locale/cart.json',
  '/:locale/cart/:path',
  '/buy/:permalink',
  '/__shopify/api/collect',
  '/.well-known/ucp',
  '/.well-known/apple-developer-merchantid-domain-association',
  '/.well-known/shopify/fec/produce',
]

export function keepUncached(route: string) {
  extendRouteRules(route, { cache: false, swr: false, isr: false }, { override: true })
}

export function addUncachedServerHandler(handler: RouteHandler) {
  addServerHandler(handler)

  keepUncached(handler.route)
}
