import { createStorage } from 'unstorage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const storages = new Map<string, ReturnType<typeof createStorage>>()

const fetchMock = vi.fn<typeof fetch>()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useStorage: (base: string) => {
    if (!storages.has(base)) storages.set(base, createStorage())

    return storages.get(base)
  },
}))

const { createStorefrontServerCache } = await import('#src/runtime/server/utils/storefront/cache')
const { createStorefrontApiClient } = await import('#src/runtime/utils/clients/storefront')

const QUERY = 'query Shop { shop { name } }'
const MUTATION = 'mutation Cart { cartCreate { cart { id } } }'

const SHOP = { shop: { name: 'Test Shop' } }

const UPSTREAM_URL = `https://test-shop.myshopify.com/api/${API_VERSION}/graphql.json`

const PRESETS = { short: { maxAge: 1, staleWhileRevalidate: 9 } }

const pending: Promise<unknown>[] = []

function configure(cache: Record<string, unknown> | false = { server: true, presets: PRESETS }, token: Record<string, string> = { publicAccessToken: 'public-token' }) {
  runtimeConfig._shopify = {
    name: 'test-shop',
    clients: {
      storefront: {
        apiVersion: API_VERSION,
        proxy: true,
        cache,
        ...token,
      },
    },
  }
}

function serverClient(headers: Record<string, string> = {}) {
  const event = createTestEvent({ path: '/products', headers: { host: 'shop.test', ...headers } })

  Object.assign(event, { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) })

  return createStorefrontApiClient<true>(runtimeConfig._shopify as never, { event, serverCache: createStorefrontServerCache(event), throwOnErrors: false })
}

async function settle() {
  await Promise.all(pending.splice(0))
}

function sentHeaders(call = -1) {
  return new Headers(fetchMock.mock.calls.at(call)![1]?.headers)
}

beforeEach(() => {
  vi.clearAllMocks()
  storages.clear()
  pending.length = 0

  configure()

  vi.stubGlobal('__NUXT_SERVER__', true)

  fetchMock.mockImplementation(async () => Response.json({ data: SHOP }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('storefront server cache', () => {
  it('serves repeated requests for a cache preset from the server cache', async () => {
    const first = await serverClient().request(QUERY, { cache: 'short' })

    await settle()

    const second = await serverClient().request(QUERY, { cache: 'short' })

    expect(first.data).toEqual(SHOP)
    expect(second.data).toEqual(SHOP)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]![0])).toBe(UPSTREAM_URL)
  })

  it('uses the server preset of a split cache option', async () => {
    await serverClient().request(QUERY, { cache: { browser: 'none', server: 'short' } })
    await settle()
    await serverClient().request(QUERY, { cache: { server: 'short' } })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('refreshes a stale entry in the background of the request that served it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })

    await serverClient().request(QUERY, { cache: 'short' })
    await settle()

    vi.setSystemTime(Date.now() + 2000)

    fetchMock.mockImplementation(async () => Response.json({ data: { shop: { name: 'Renamed Shop' } } }))

    const stale = await serverClient().request(QUERY, { cache: 'short' })

    expect(stale.data).toEqual(SHOP)
    expect(pending).toHaveLength(1)

    await settle()

    const fresh = await serverClient().request(QUERY, { cache: 'short' })

    expect(fresh.data).toEqual({ shop: { name: 'Renamed Shop' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends a cached request without the visitor\'s cookies, language or IP and without the preset header', async () => {
    configure(undefined, { privateAccessToken: 'private-token', buyerIpHeader: 'x-forwarded-for' })

    const client = serverClient({ 'cookie': '_shopify_y=visitor; theme=dark', 'x-forwarded-for': '203.0.113.7' })

    await client.request(QUERY, { headers: { 'Accept-Language': 'de' } })
    await client.request(QUERY, { cache: 'short', headers: { 'Accept-Language': 'de' } })

    const [uncached, cached] = [sentHeaders(0), sentHeaders(1)]

    expect(uncached.get('cookie')).toBe('_shopify_y=visitor')
    expect(uncached.get('accept-language')).toBe('de')
    expect(uncached.get('shopify-storefront-buyer-ip')).toBe('203.0.113.7')

    expect(cached.has('cookie')).toBe(false)
    expect(cached.has('accept-language')).toBe(false)
    expect(cached.has('shopify-storefront-buyer-ip')).toBe(false)
    expect(cached.has('x-shopify-server-cache')).toBe(false)
    expect(cached.get('shopify-storefront-private-token')).toBe('private-token')
  })

  it('sends a request without a cache preset straight to Shopify, with the Shopify cookies', async () => {
    await serverClient({ cookie: '_shopify_y=visitor; theme=dark' }).request(QUERY)
    await serverClient({ cookie: '_shopify_y=visitor; theme=dark' }).request(QUERY)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentHeaders().get('cookie')).toBe('_shopify_y=visitor')
  })

  it.each([
    ['a mutation', MUTATION, 'short'],
    ['a mutation on the line after the #graphql marker', `#graphql\n${MUTATION}`, 'short'],
    ['an unknown cache preset', QUERY, 'forever'],
  ])('sends %s straight to Shopify, without the preset header', async (_, query, preset) => {
    await serverClient().request(query, { cache: preset })
    await settle()
    await serverClient().request(query, { cache: preset })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentHeaders().has('x-shopify-server-cache')).toBe(false)
  })

  it.each([
    ['GraphQL errors', () => Response.json({ errors: [{ message: 'Throttled' }] })],
    ['an error status', () => Response.json({ errors: 'Service unavailable' }, { status: 503 })],
  ])('never caches a response with %s', async (_, respond) => {
    fetchMock.mockImplementation(async () => respond())

    await serverClient().request(QUERY, { cache: 'short' })
    await settle()
    await serverClient().request(QUERY, { cache: 'short' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the entries of different access tokens apart', async () => {
    await serverClient().request(QUERY, { cache: 'short' })
    await settle()

    configure(undefined, { publicAccessToken: 'other-token' })

    await serverClient().request(QUERY, { cache: 'short' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['the default mount', true, 'storefront-cache'],
    ['a configured mount', 'redis-cache', 'redis-cache'],
  ])('stores entries in %s', async (_, server, base) => {
    configure({ server, presets: PRESETS })

    await serverClient().request(QUERY, { cache: 'short' })
    await settle()

    expect([...storages.keys()]).toStrictEqual([base])
    expect(await storages.get(base)!.getKeys()).toHaveLength(1)
  })
})
