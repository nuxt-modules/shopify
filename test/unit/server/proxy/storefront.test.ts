import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const upstream = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

const cacheStore = new Map<string, unknown>()

let definitions = 0

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: (
    fn: (...args: never[]) => Promise<unknown>,
    options: { getKey: (...args: never[]) => string },
  ) => {
    definitions++

    return async (...args: never[]) => {
      const key = options.getKey(...args)

      if (!cacheStore.has(key)) cacheStore.set(key, await fn(...args))

      return cacheStore.get(key)
    }
  },
}))

const handler = (await import('#src/runtime/server/api/proxy/storefront')).default

const query = '{ shop { name } }'

function proxyEvent(headers: Record<string, string> = {}, body: unknown = { query }) {
  return createTestEvent({ method: 'POST', path: '/_proxy/storefront', headers, body })
}

const lastCall = () => ({
  url: upstream.mock.calls.at(-1)?.[0] as string,
  headers: (upstream.mock.calls.at(-1)?.[1] as { headers: Record<string, string> }).headers,
  body: (upstream.mock.calls.at(-1)?.[1] as { body: unknown }).body,
})

beforeEach(() => {
  vi.clearAllMocks()

  upstream.mockResolvedValue({ _data: { data: { shop: { name: 'Test Shop' } } }, headers: new Headers() })

  globalThis.$fetch = { raw: upstream } as never

  runtimeConfig._shopify = {
    name: 'test-shop',
    clients: {
      storefront: {
        apiVersion: '2026-01',
        publicAccessToken: 'public-token',
      },
    },
  }
})

describe('request guarding', () => {
  it('rejects a cross-site request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 403 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects a cross-site request before reading the body', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'cross-site' }, 'not json')))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a same-origin request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'same-origin' }))).resolves.toBeDefined()
  })

  it('rejects a body without a query', async () => {
    await expect(handler(proxyEvent({}, { variables: {} }))).rejects.toBeDefined()
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects a non string query', async () => {
    await expect(handler(proxyEvent({}, { query: 42 }))).rejects.toBeDefined()
  })

  it('rejects non object variables', async () => {
    await expect(handler(proxyEvent({}, { query, variables: 'nope' }))).rejects.toBeDefined()
  })

  it('forwards a valid query with its variables', async () => {
    await handler(proxyEvent({}, { query, variables: { first: 3 } }))

    expect(lastCall().body).toEqual({ query, variables: { first: 3 } })
  })
})

describe('header forwarding', () => {
  it('forwards the allow listed request headers', async () => {
    await handler(proxyEvent({
      'accept-language': 'de-DE',
      'x-shopify-storefront-access-token': 'public-token',
      'user-agent': 'test-agent',
    }))

    expect(lastCall().headers).toMatchObject({
      'accept-language': 'de-DE',
      'x-shopify-storefront-access-token': 'public-token',
      'user-agent': 'test-agent',
    })
  })

  it('drops headers that are not on the allow list', async () => {
    await handler(proxyEvent({
      'authorization': 'Bearer secret',
      'x-forwarded-for': '203.0.113.1',
      'x-custom-header': 'value',
    }))

    const { headers } = lastCall()

    expect(headers).not.toHaveProperty('authorization')
    expect(headers).not.toHaveProperty('x-forwarded-for')
    expect(headers).not.toHaveProperty('x-custom-header')
  })

  it('forwards only shopify cookies upstream', async () => {
    await handler(proxyEvent({
      cookie: '_shopify_y=abc; session=super-secret; _shopify_s=def; cart_token=xyz',
    }))

    expect(lastCall().headers.cookie).toBe('_shopify_y=abc; _shopify_s=def')
  })

  it('sends no cookie header when the request has no shopify cookies', async () => {
    await handler(proxyEvent({ cookie: 'session=super-secret' }))

    expect(lastCall().headers).not.toHaveProperty('cookie')
  })
})

describe('api version override', () => {
  it('targets the configured api version by default', async () => {
    await handler(proxyEvent())

    expect(lastCall().url).toContain('/api/2026-01/')
  })

  it('accepts a valid requested api version', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-api-version': '2025-10' }))

    expect(lastCall().url).toContain('/api/2025-10/')
  })

  it('accepts the unstable api version', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-api-version': 'unstable' }))

    expect(lastCall().url).toContain('/api/unstable/')
  })

  it.each([
    ['../../admin/api/2026-01/graphql.json'],
    ['2026-1'],
    ['https://evil.example'],
    ['26-01'],
  ])('ignores the malformed api version %s', async (version) => {
    await handler(proxyEvent({ 'x-shopify-proxy-api-version': version }))

    expect(lastCall().url).toContain('/api/2026-01/')
  })
})

describe('proxy cache', () => {
  const cacheable = {
    proxy: { driver: 'lru-cache' },
    presets: { short: { maxAge: 1, staleMaxAge: 9, swr: true }, long: { maxAge: 3600, staleMaxAge: 82800, swr: true } },
  }

  beforeEach(() => {
    cacheStore.clear()

    runtimeConfig._shopify = {
      name: 'test-shop',
      clients: {
        storefront: {
          apiVersion: '2026-01',
          publicAccessToken: 'public-token',
          cache: cacheable,
        },
      },
    }
  })

  it('goes upstream once for a repeated cacheable request', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short' }))

    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('never caches a request without a known preset', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'bogus' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'bogus' }))
    await handler(proxyEvent())

    expect(upstream).toHaveBeenCalledTimes(3)
  })

  it('keys separately per preset', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'long' }))

    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it('keys separately per access token', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'x-shopify-storefront-access-token': 'tenant-a' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'x-shopify-storefront-access-token': 'tenant-b' }))

    expect(upstream).toHaveBeenCalledTimes(2)

    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'x-shopify-storefront-access-token': 'tenant-a' }))

    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it('keys separately per private access token', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'shopify-storefront-private-token': 'private-a' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'shopify-storefront-private-token': 'private-b' }))

    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it('ignores headers that cannot change the response', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'user-agent': 'one' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'user-agent': 'two' }))

    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('builds the cached function once per preset instead of once per request', async () => {
    vi.resetModules()

    definitions = 0
    cacheStore.clear()

    const fresh = (await import('#src/runtime/server/api/proxy/storefront')).default

    for (let request = 0; request < 4; request++) {
      await fresh(proxyEvent({ 'x-shopify-proxy-cache': 'short', 'x-shopify-storefront-access-token': `tenant-${request}` }))
    }

    expect(upstream).toHaveBeenCalledTimes(4)
    expect(definitions).toBe(1)

    await fresh(proxyEvent({ 'x-shopify-proxy-cache': 'long' }))

    expect(definitions).toBe(2)
  })

  it('never grows its cached function registry from request supplied preset names', async () => {
    vi.resetModules()

    definitions = 0

    const fresh = (await import('#src/runtime/server/api/proxy/storefront')).default

    const hostile = [
      '__proto__',
      'constructor',
      'prototype',
      'toString',
      'hasOwnProperty',
      ...Array.from({ length: 500 }, (_, index) => `preset-${index}`),
    ]

    for (const name of hostile) {
      await fresh(proxyEvent({ 'x-shopify-proxy-cache': name }))
    }

    expect(definitions).toBe(0)

    await fresh(proxyEvent({ 'x-shopify-proxy-cache': 'short' }))
    await fresh(proxyEvent({ 'x-shopify-proxy-cache': 'long' }))

    expect(definitions).toBe(2)
  })

  it('never treats an inherited object property as a configured preset', async () => {
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'toString' }))
    await handler(proxyEvent({ 'x-shopify-proxy-cache': 'toString' }))

    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it('forwards tracking headers on a miss but never replays them on a hit', async () => {
    upstream.mockResolvedValue({
      _data: { data: {} },
      headers: new Headers({ 'server-timing': '_y;desc=abc, _s;desc=def' }),
    })

    const miss = proxyEvent({ 'x-shopify-proxy-cache': 'short' })

    await handler(miss)

    expect(miss.node.res.getHeader('server-timing')).toBeTruthy()

    const hit = proxyEvent({ 'x-shopify-proxy-cache': 'short' })

    await handler(hit)

    expect(upstream).toHaveBeenCalledTimes(1)
    expect(hit.node.res.getHeader('server-timing')).toBeFalsy()
  })
})

describe('mock mode', () => {
  it('targets mock.shop when the client is mocked', async () => {
    runtimeConfig._shopify = {
      name: 'test-shop',
      clients: { storefront: { apiVersion: '2026-01', mock: true } },
    }

    await handler(proxyEvent())

    expect(lastCall().url).toContain('mock.shop')
  })
})
