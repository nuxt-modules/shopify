import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getSetCookieHeaders } from '#test/helpers/event'

const runtimeConfig = {
  _shopify: {
    name: 'shop',
    clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0, routes: true } },
    analytics: false,
    routeTemplates: {},
    i18n: { defaultLocale: { country: 'US', language: 'EN' } },
  },
}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => runtimeConfig,
  getRouteRules: () => ({}),
  useEvent: () => undefined,
  useNitroApp: () => ({ hooks: { callHook: vi.fn(), callHookWith: vi.fn() } }),
  useStorage: vi.fn(),
}))

const middleware = (await import('#src/runtime/server/middleware/routes')).default
const { useStorefront } = await import('#src/runtime/server/utils/storefront/client')
const { applyShopifyResponseHeaders } = await import('#src/runtime/server/utils/request-context')

const SHOPIFY_COOKIES = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure', '_shopify_marketing=m; Path=/; HttpOnly; Secure']

async function serverRoute(method: string) {
  vi.stubGlobal('fetch', vi.fn(async () => {
    const headers = new Headers({ 'content-type': 'application/json' })

    for (const cookie of SHOPIFY_COOKIES) headers.append('set-cookie', cookie)

    return new Response(JSON.stringify({ data: { cartCreate: { cart: { id: 'gid://shopify/Cart/1' } } } }), { headers })
  }))

  const event = createTestEvent({ method, path: '/api/subscribe', headers: { host: 'shop.test', cookie: '_shopify_essential=old' } })

  await middleware(event)

  event.node.res.setHeader('content-type', 'application/json')

  await useStorefront(event).request('mutation CartCreate { cartCreate { cart { id } } }')

  applyShopifyResponseHeaders(event)

  return getSetCookieHeaders(event)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Shopify\'s cookies from the server storefront client', () => {
  it('reach the response of a POST server route, as Hydrogen hands them on for its own routes', async () => {
    expect(await serverRoute('POST')).toEqual(SHOPIFY_COOKIES)
  })

  it('stay out of the response of a GET server route, as with Hydrogen', async () => {
    expect(await serverRoute('GET')).toEqual([])
  })
})
