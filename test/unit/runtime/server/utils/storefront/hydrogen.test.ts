import { createPredictiveSearchServerHandlers, handleShopifyRoutes } from '@shopify/hydrogen'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

const { getShopifyRequestContext } = await import('#src/runtime/server/utils/request-context')
const { toShopifyRequest } = await import('#src/runtime/server/utils/routes')
const { createHydrogenStorefrontClient } = await import('#src/runtime/server/utils/storefront/hydrogen')

describe('Shopify\'s cookies from Hydrogen\'s storefront client', () => {
  const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, defaultMarket: { country: 'US', language: 'EN' } }

  const SHOPIFY_COOKIES = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure', '_shopify_marketing=m; Path=/; HttpOnly; Secure']

  const predictiveSearch = { data: { predictiveSearch: { articles: [], collections: [], pages: [], products: [], queries: [] } } }

  function stubStorefrontApi(body: unknown) {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const headers = new Headers({ 'content-type': 'application/json' })

      for (const cookie of SHOPIFY_COOKIES) headers.append('set-cookie', cookie)

      return new Response(JSON.stringify(body), { headers })
    }))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps them out of a predictive search response, as Hydrogen\'s own response headers do for a GET request', async () => {
    runtimeConfig._shopify = config

    stubStorefrontApi(predictiveSearch)

    const event = createTestEvent({ path: '/api/predictive-search?q=shirt', headers: { host: 'shop.test' } })
    const requestContext = await getShopifyRequestContext(event)

    const response = await handleShopifyRoutes({
      request: toShopifyRequest(event),
      requestContext,
      storefrontClient: createHydrogenStorefrontClient(requestContext, config as never),
      routeTemplates: {},
      handlers: [createPredictiveSearchServerHandlers()],
    })

    expect(response?.status).toBe(200)
    expect(response?.headers.getSetCookie()).toEqual([])
  })

  it('still hands them over through Hydrogen\'s response headers when Hydrogen allows it', async () => {
    runtimeConfig._shopify = config

    stubStorefrontApi({ data: { shop: { id: '1' } } })

    const event = createTestEvent({ method: 'POST', path: '/api/cart', headers: { host: 'shop.test', cookie: '_shopify_essential=e' } })
    const requestContext = await getShopifyRequestContext(event)

    const result = await createHydrogenStorefrontClient(requestContext, config as never).graphql('query { shop { id } }')

    expect(result.headers.getSetCookie()).toEqual([])

    const headers = new Headers({ 'content-type': 'application/json' })

    requestContext.applyResponseHeaders(headers)

    expect(headers.getSetCookie()).toEqual(SHOPIFY_COOKIES)
  })
})

describe('the storefront ID from Hydrogen\'s storefront client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function sentStorefrontId(storefront: Record<string, unknown>) {
    const config = { name: 'shop', storefrontId: '1000000001', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', ...storefront } }, defaultMarket: { country: 'US', language: 'EN' } }
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: { shop: { id: '1' } } }))

    runtimeConfig._shopify = config

    vi.stubGlobal('fetch', fetchMock)

    const event = createTestEvent({ method: 'POST', path: '/api/cart', headers: { host: 'shop.test' } })
    const requestContext = await getShopifyRequestContext(event)

    await createHydrogenStorefrontClient(requestContext, config as never).graphql('query { shop { id } }')

    return new Headers(fetchMock.mock.calls[0]![1]?.headers).get('shopify-storefront-id')
  }

  it('sends it to the store', async () => {
    expect(await sentStorefrontId({})).toBe('1000000001')
  })

  it('leaves it out for mock.shop, like the module\'s own client', async () => {
    expect(await sentStorefrontId({ mock: true })).toBeNull()
  })
})
