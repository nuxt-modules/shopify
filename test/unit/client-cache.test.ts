import type { Storage, StorageValue } from 'unstorage'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStorage as createLruStorage } from 'unstorage'

import lruCacheDriver from '../../src/runtime/utils/lru-driver'
import useCache from '../../src/runtime/utils/clients/cache'

const presets = {
  short: { maxAge: 1, staleMaxAge: 9, swr: true },
  long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
}

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

describe('client cache', () => {
  it('serves a repeated request from the cache', async () => {
    const storage = createStorage()
    const request = createRequest()

    const first = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    const second = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).toStrictEqual(first)
  })

  it('derives the ttl from the named cache tier', async () => {
    const storage = createStorage()

    await useCache(storage, createRequest() as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    await useCache(storage, createRequest() as never, 'query Y { b }' as never, { cache: 'long' } as never, presets)

    expect([...ttls.values()]).toStrictEqual([{ ttl: 10_000 }, { ttl: 86_400_000 }])
  })

  it('keys separately per operation and per variables', async () => {
    const storage = createStorage()
    const request = createRequest()

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    await useCache(storage, request as never, 'query Y { b }' as never, { cache: 'short' } as never, presets)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', variables: { handle: 'a' } } as never, presets)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', variables: { handle: 'b' } } as never, presets)

    expect(request).toHaveBeenCalledTimes(4)
    expect(store.size).toBe(4)
  })

  it('does not cache when no storage is available', async () => {
    const request = createRequest()

    await useCache(undefined, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    await useCache(undefined, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not cache an unknown cache tier', async () => {
    const storage = createStorage()
    const request = createRequest()

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'nope' } as never, presets)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'nope' } as never, presets)

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('does not cache a response that carries errors', async () => {
    const storage = createStorage()
    const request = vi.fn(async () => ({ data: undefined, errors: { message: 'boom' }, headers: new Headers() }))

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('asks the proxy for the same tier it caches under', async () => {
    const request = createRequest()

    await useCache(createStorage(), request as never, 'query X { a }' as never, { cache: 'long' } as never, presets)

    expect(requestOptions(request)).toMatchObject({ headers: { 'X-Shopify-Proxy-Cache': 'long' } })
  })

  it('caches a request that carries an abort signal', async () => {
    const storage = createStorage()
    const request = createRequest()

    const first = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', signal: new AbortController().signal } as never, presets)
    const second = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', signal: new AbortController().signal } as never, presets)

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).toStrictEqual(first)
  })

  it('passes an abort signal through when caching is off', async () => {
    const request = createRequest()
    const signal = new AbortController().signal

    await useCache(undefined, request as never, 'query X { a }' as never, { signal } as never, presets)

    expect(requestOptions(request)).toMatchObject({ signal })
  })

  it('supports split client and proxy cache tiers', async () => {
    const request = createRequest()

    await useCache(
      createStorage(),
      request as never,
      'query X { a }' as never,
      { cache: { client: 'short', proxy: 'long' } } as never,
      presets,
    )

    expect(requestOptions(request)).toMatchObject({ headers: { 'X-Shopify-Proxy-Cache': 'long' } })
    expect([...ttls.values()]).toStrictEqual([{ ttl: 10_000 }])
  })

  it('keeps the response headers intact across a cache hit', async () => {
    const storage = createLruStorage({ driver: lruCacheDriver({}) })
    const request = vi.fn(async () => ({ data: { a: 1 }, headers: new Headers({ 'x-a': 'b' }) }))

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)
    const hit = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    expect(request).toHaveBeenCalledTimes(1)
    expect(hit.headers).toBeInstanceOf(Headers)
    expect(hit.headers?.get('x-a')).toBe('b')
  })

  it('returns a fresh copy of the cached response to each caller', async () => {
    const storage = createLruStorage({ driver: lruCacheDriver({}) })
    const request = vi.fn(async () => ({ data: { product: { title: 'original' } }, headers: new Headers() }))

    const first = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    product(first).title = 'mutated'

    const second = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, presets)

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).not.toBe(first)
    expect(product(second).title).toBe('original')
  })
})
