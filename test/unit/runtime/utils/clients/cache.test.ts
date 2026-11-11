import type { Storage, StorageValue } from 'unstorage'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStorage as createLruStorage } from 'unstorage'

import lruCacheDriver from '#src/runtime/utils/lru-driver'
import { requestWithCache } from '#src/runtime/utils/clients/cache'

const presets = {
  short: { maxAge: 2, staleWhileRevalidate: 3 },
  long: { maxAge: 60, staleWhileRevalidate: 240 },
}

const QUERY = 'query X { a }'
const OTHER_QUERY = 'query Y { b }'

let store: Map<string, unknown>
let ttls: Map<string, unknown>

function createStorage() {
  return {
    hasItem: async (key: string) => store.has(key),
    getItemRaw: async (key: string) => store.get(key) ?? null,
    setItemRaw: async (key: string, value: unknown, opts?: unknown) => {
      store.set(key, value)
      ttls.set(key, opts)
    },
  } as unknown as Storage<StorageValue>
}

function createRequest(data: unknown = { product: { id: '1' } }) {
  return vi.fn(async (..._args: unknown[]) => ({ data, headers: new Headers() }))
}

function cached(
  storage: Storage<StorageValue> | undefined,
  request: unknown,
  query: string,
  options: Record<string, unknown> = {},
) {
  return requestWithCache({ storage, presets, serverCache: true }, request as never, query as never, options as never)
}

function requestOptions(request: ReturnType<typeof createRequest>) {
  return request.mock.calls[0]?.[1]
}

function product(response: unknown) {
  return (response as { data: { product: { title: string } } }).data.product
}

beforeEach(() => {
  store = new Map()
  ttls = new Map()
})

describe('browser cache', () => {
  it('derives the ttl from the named preset', async () => {
    const storage = createStorage()

    await cached(storage, createRequest(), QUERY, { cache: 'short' })
    await cached(storage, createRequest(), OTHER_QUERY, { cache: 'long' })

    expect([...ttls.values()]).toStrictEqual([{ ttl: 5_000 }, { ttl: 300_000 }])
  })

  it('reads the durations of a preset the way Hydrogen does', async () => {
    await requestWithCache({
      storage: createStorage(),
      presets: { tiny: { maxAge: { minutes: 1 }, staleWhileRevalidate: { seconds: 30 }, staleIfError: 600 } },
      serverCache: true,
    }, createRequest() as never, QUERY as never, { cache: 'tiny' } as never)

    expect([...ttls.values()]).toStrictEqual([{ ttl: 90_000 }])
  })

  it('keys separately per operation and per variables', async () => {
    const storage = createStorage()
    const request = createRequest()

    await cached(storage, request, QUERY, { cache: 'short' })
    await cached(storage, request, OTHER_QUERY, { cache: 'short' })
    await cached(storage, request, QUERY, { cache: 'short', variables: { handle: 'a' } })
    await cached(storage, request, QUERY, { cache: 'short', variables: { handle: 'b' } })

    expect(request).toHaveBeenCalledTimes(4)
    expect(store.size).toBe(4)
  })

  it('does not cache when no storage is available', async () => {
    const request = createRequest()

    await cached(undefined, request, QUERY, { cache: 'short' })
    await cached(undefined, request, QUERY, { cache: 'short' })

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not cache under an unknown preset', async () => {
    const storage = createStorage()
    const request = createRequest()

    await cached(storage, request, QUERY, { cache: 'nope' })
    await cached(storage, request, QUERY, { cache: 'nope' })

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('never caches a mutation', async () => {
    const storage = createStorage()
    const request = createRequest({ cartCreate: { cart: { id: 'gid://shopify/Cart/1' } } })

    await cached(storage, request, 'mutation CreateCart { cartCreate { cart { id } } }', { cache: 'long' })
    await cached(storage, request, 'mutation CreateCart { cartCreate { cart { id } } }', { cache: 'long' })

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('does not cache a response that carries errors', async () => {
    const storage = createStorage()
    const request = vi.fn(async () => ({ data: undefined, errors: { message: 'boom' }, headers: new Headers() }))

    await cached(storage, request, QUERY, { cache: 'short' })
    await cached(storage, request, QUERY, { cache: 'short' })

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('caches a request that carries an abort signal', async () => {
    const storage = createStorage()
    const request = createRequest()

    const first = await cached(storage, request, QUERY, { cache: 'short', signal: new AbortController().signal })
    const second = await cached(storage, request, QUERY, { cache: 'short', signal: new AbortController().signal })

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).toStrictEqual(first)
  })

  it('passes an abort signal through when caching is off', async () => {
    const request = createRequest()
    const signal = new AbortController().signal

    await cached(undefined, request, QUERY, { signal })

    expect(requestOptions(request)).toMatchObject({ signal })
  })

  it('supports split browser and server cache presets', async () => {
    const request = createRequest()

    await cached(createStorage(), request, QUERY, { cache: { browser: 'short', server: 'long' } })

    expect(requestOptions(request)).toMatchObject({ headers: { 'X-Shopify-Server-Cache': 'long' } })
    expect([...ttls.values()]).toStrictEqual([{ ttl: 5_000 }])
  })

  it('keeps the response headers intact across a cache hit', async () => {
    const storage = createLruStorage({ driver: lruCacheDriver({}) })
    const request = vi.fn(async () => ({ data: { a: 1 }, headers: new Headers({ 'x-a': 'b' }) }))

    await cached(storage, request, QUERY, { cache: 'short' })
    const hit = await cached(storage, request, QUERY, { cache: 'short' })

    expect(request).toHaveBeenCalledTimes(1)
    expect(hit.headers).toBeInstanceOf(Headers)
    expect(hit.headers?.get('x-a')).toBe('b')
  })

  it('returns a fresh copy of the cached response to each caller', async () => {
    const storage = createLruStorage({ driver: lruCacheDriver({}) })
    const request = vi.fn(async () => ({ data: { product: { title: 'original' } }, headers: new Headers() }))

    const first = await cached(storage, request, QUERY, { cache: 'short' })

    product(first).title = 'mutated'

    const second = await cached(storage, request, QUERY, { cache: 'short' })

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).not.toBe(first)
    expect(product(second).title).toBe('original')
  })
})
