import type { ShopifyRequestContext, StorefrontClient } from '@shopify/hydrogen'

import { StorefrontApiError, StorefrontTimeoutError, createPredictiveSearchServerHandlers, handleShopifyRoutes } from '@shopify/hydrogen'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'
import { createLogReporter } from '#test/helpers/logger'

type ConfigureHook = (params: { config: { headers: Record<string, string>, retries?: number } }) => void

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const configureHooks: ConfigureHook[] = []

const hooks = {
  callHook: vi.fn(async (_name: string, _params: unknown) => {}),
  callHookWith: vi.fn((caller: (hooks: ConfigureHook[], args: unknown[]) => void, name: string, ...args: unknown[]) => caller(name === 'shopify:storefront:client:configure' ? configureHooks : [], args)),
}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('nitropack/runtime', () => ({ useNitroApp: () => ({ hooks }) }))

const { getShopifyRequestContext } = await import('#src/runtime/server/utils/request-context')
const { toShopifyRequest } = await import('#src/runtime/server/utils/routes')

const createHydrogenStorefrontClient = (await import('#src/runtime/server/utils/storefront/hydrogen')).createHydrogenStorefrontClient as unknown as (requestContext: ShopifyRequestContext, config: object) => StorefrontClient

const SHOP_QUERY = 'query Shop { shop { id } }'

const shopConfig = (storefront: Record<string, unknown> = {}) => ({
  name: 'shop',
  clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0, ...storefront } },
  i18n: { defaultLocale: { country: 'US', language: 'EN' } },
})

async function createClient(config: Record<string, unknown> = shopConfig()) {
  runtimeConfig._shopify = config

  const event = createTestEvent({ method: 'POST', path: '/api/cart', headers: { host: 'shop.test' } })

  return createHydrogenStorefrontClient(await getShopifyRequestContext(event), config)
}

function hookCalls(name: string) {
  return hooks.callHook.mock.calls.filter(([hook]) => hook === name).map(([, params]) => params)
}

beforeEach(() => {
  hooks.callHook.mockClear()
  hooks.callHookWith.mockClear()
  configureHooks.length = 0
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Shopify\'s cookies from Hydrogen\'s storefront client', () => {
  const config = shopConfig()

  const SHOPIFY_COOKIES = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure', '_shopify_marketing=m; Path=/; HttpOnly; Secure']

  const predictiveSearch = { data: { predictiveSearch: { articles: [], collections: [], pages: [], products: [], queries: [] } } }

  function stubStorefrontApi(body: unknown) {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const headers = new Headers({ 'content-type': 'application/json' })

      for (const cookie of SHOPIFY_COOKIES) headers.append('set-cookie', cookie)

      return new Response(JSON.stringify(body), { headers })
    }))
  }

  it('keeps them out of a predictive search response, as Hydrogen\'s own response headers do for a GET request', async () => {
    runtimeConfig._shopify = config

    stubStorefrontApi(predictiveSearch)

    const event = createTestEvent({ path: '/api/predictive-search?q=shirt', headers: { host: 'shop.test' } })
    const requestContext = await getShopifyRequestContext(event)

    const response = await handleShopifyRoutes({
      request: toShopifyRequest(event),
      requestContext,
      storefrontClient: createHydrogenStorefrontClient(requestContext, config),
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

    const result = await createHydrogenStorefrontClient(requestContext, config).graphql(SHOP_QUERY)

    expect(result.headers.getSetCookie()).toEqual([])

    const headers = new Headers({ 'content-type': 'application/json' })

    requestContext.applyResponseHeaders(headers)

    expect(headers.getSetCookie()).toEqual(SHOPIFY_COOKIES)
  })
})

describe('the storefront ID from Hydrogen\'s storefront client', () => {
  async function sentStorefrontId(storefront: Record<string, unknown>) {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: { shop: { id: '1' } } }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient({ ...shopConfig(storefront), storefrontId: '1000000001' })

    await client.graphql(SHOP_QUERY)

    return new Headers(fetchMock.mock.calls[0]![1]?.headers).get('shopify-storefront-id')
  }

  it('sends it to the store', async () => {
    expect(await sentStorefrontId({})).toBe('1000000001')
  })

  it('leaves it out for mock.shop, like the module\'s own client', async () => {
    expect(await sentStorefrontId({ mock: true })).toBeNull()
  })
})

describe('the storefront client hooks for Hydrogen\'s requests', () => {
  it('calls the request and response hooks with the operation and its variables', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { shop: { id: '1' } } })))

    const client = await createClient()

    await client.graphql(SHOP_QUERY, { variables: { handle: 'shirt' } })

    expect(hookCalls('shopify:storefront:client:request')).toEqual([{ operation: SHOP_QUERY, options: { variables: { handle: 'shirt' } } }])
    expect(hookCalls('shopify:storefront:client:response')).toEqual([{
      operation: SHOP_QUERY,
      options: { variables: { handle: 'shirt' } },
      response: { data: { shop: { id: '1' } }, errors: undefined },
    }])
    expect(hookCalls('shopify:storefront:client:errors')).toEqual([])
  })

  it('reports the GraphQL errors of a response to the response and errors hooks', async () => {
    const graphQLErrors = [{ message: 'Field does not exist', locations: [{ line: 1, column: 15 }], path: ['shop'], extensions: { code: 'undefinedField' } }]

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: null, errors: graphQLErrors })))

    const client = await createClient()

    const result = await client.graphql(SHOP_QUERY)

    expect(result.errors).toEqual(graphQLErrors)
    expect(hookCalls('shopify:storefront:client:response')).toMatchObject([{ response: { data: null, errors: { graphQLErrors } } }])
    expect(hookCalls('shopify:storefront:client:errors')).toEqual([{ errors: { graphQLErrors } }])
  })

  it('reports a failed request with its status and still fails it as Hydrogen does', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Internal Server Error', { status: 500 })))

    const client = await createClient()

    await expect(client.graphql(SHOP_QUERY)).rejects.toBeInstanceOf(StorefrontApiError)

    const errors = { networkStatusCode: 500, message: expect.stringContaining('SFAPI responded with 500') }

    expect(hookCalls('shopify:storefront:client:response')).toMatchObject([{ operation: SHOP_QUERY, response: { errors } }])
    expect(hookCalls('shopify:storefront:client:errors')).toMatchObject([{ errors }])
  })

  it('leaves the response hooks out for a request the caller cancelled, like the module\'s own client', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { shop: { id: '1' } } })))

    const client = await createClient()
    const caller = new AbortController()

    caller.abort()

    await expect(client.graphql(SHOP_QUERY, { signal: caller.signal })).rejects.toThrow()

    expect(hookCalls('shopify:storefront:client:response')).toEqual([])
    expect(hookCalls('shopify:storefront:client:errors')).toEqual([])
  })
})

describe('the storefront client config for Hydrogen\'s requests', () => {
  it('runs the configure hook on the first request only, so Hydrogen\'s proxies that never query leave it alone', async () => {
    const configure = vi.fn<ConfigureHook>()

    configureHooks.push(configure)

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { shop: { id: '1' } } })))

    const client = await createClient()

    expect(configure).not.toHaveBeenCalled()

    await client.graphql(SHOP_QUERY)
    await client.graphql(SHOP_QUERY)

    expect(configure).toHaveBeenCalledOnce()
    expect(configure.mock.calls[0]![0].config.headers).toMatchObject({ 'X-Shopify-Storefront-Access-Token': 'public' })
  })

  it('sends the configured headers and the ones a configure hook adds', async () => {
    configureHooks.push(({ config }) => {
      config.headers['X-From-Hook'] = 'hook'
    })

    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: { shop: { id: '1' } } }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient(shopConfig({ headers: { 'X-Request-Source': 'nuxt-shopify' } }))

    await client.graphql(SHOP_QUERY)

    const headers = new Headers(fetchMock.mock.calls[0]![1]?.headers)

    expect(headers.get('x-request-source')).toBe('nuxt-shopify')
    expect(headers.get('x-from-hook')).toBe('hook')
    expect(headers.get('x-sdk-variant')).toBe('hydrogen')
  })

  it('retries a request that Shopify throttled as often as the client config allows', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ data: { shop: { id: '1' } } }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient(shopConfig({ retries: 1 }))
    const pending = client.graphql(SHOP_QUERY)

    await vi.advanceTimersByTimeAsync(1000)

    await expect(pending).resolves.toMatchObject({ data: { shop: { id: '1' } } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('still fails a request that runs out of time with Hydrogen\'s timeout error', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => AbortSignal.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError')))

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      throw init?.signal?.reason
    }))

    const client = await createClient()

    await expect(client.graphql(SHOP_QUERY)).rejects.toBeInstanceOf(StorefrontTimeoutError)
  })

  it('still fails a request that the caller cancels while it runs with the abort error', async () => {
    const caller = new AbortController()

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient()
    const pending = client.graphql(SHOP_QUERY, { signal: caller.signal })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

    caller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('doesn\'t retry without retries in the client config', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('Too Many Requests', { status: 429 }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient()

    await expect(client.graphql(SHOP_QUERY)).rejects.toBeInstanceOf(StorefrontApiError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('traces each response with the configured logger, without the request\'s headers', async () => {
    const { log, logger } = createLogReporter()

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { shop: { id: '1' } } })))

    const client = await createClient({ ...shopConfig(), logger: { ...logger, level: 5 } })

    await client.graphql(SHOP_QUERY)

    const traces = log.mock.calls.map(([entry]) => entry).filter(entry => entry.type === 'trace')

    expect(traces).toMatchObject([{ tag: 'shopify', args: [{ type: 'HTTP-Response', content: { requestParams: [`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`] } }] }])
  })

  it('still queries the store without a storefront client, such as for Shopify\'s scripts alone', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: { shop: { id: '1' } } }))

    vi.stubGlobal('fetch', fetchMock)

    const client = await createClient({ name: 'shop', clients: {}, analytics: true, i18n: { defaultLocale: { country: 'US', language: 'EN' } } })

    await expect(client.graphql(SHOP_QUERY)).resolves.toMatchObject({ data: { shop: { id: '1' } } })
    expect(hooks.callHookWith).not.toHaveBeenCalledWith(expect.any(Function), 'shopify:storefront:client:configure', expect.anything())
  })
})
