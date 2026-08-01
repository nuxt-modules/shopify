import type { Storage, StorageValue } from 'unstorage'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import useCache from '../../src/runtime/utils/clients/cache'

const options = {
  short: { maxAge: 1, staleMaxAge: 9, swr: true },
  long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
}

let store: Map<string, unknown>
let ttls: Map<string, unknown>

function createStorage() {
  return {
    hasItem: async (key: string) => store.has(key),
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: unknown, opts?: unknown) => {
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

beforeEach(() => {
  store = new Map()
  ttls = new Map()
})

describe('client cache', () => {
  it('serves a repeated request from the cache', async () => {
    const storage = createStorage()
    const request = createRequest()

    const first = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)
    const second = await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)

    expect(request).toHaveBeenCalledTimes(1)
    expect(second).toStrictEqual(first)
  })

  it('derives the ttl from the named cache tier', async () => {
    const storage = createStorage()

    await useCache(storage, createRequest() as never, 'query X { a }' as never, { cache: 'short' } as never, options)
    await useCache(storage, createRequest() as never, 'query Y { b }' as never, { cache: 'long' } as never, options)

    expect([...ttls.values()]).toStrictEqual([{ ttl: 10_000 }, { ttl: 86_400_000 }])
  })

  it('keys separately per operation and per variables', async () => {
    const storage = createStorage()
    const request = createRequest()

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)
    await useCache(storage, request as never, 'query Y { b }' as never, { cache: 'short' } as never, options)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', variables: { handle: 'a' } } as never, options)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short', variables: { handle: 'b' } } as never, options)

    expect(request).toHaveBeenCalledTimes(4)
    expect(store.size).toBe(4)
  })

  it('does not cache when no storage is available', async () => {
    const request = createRequest()

    await useCache(undefined, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)
    await useCache(undefined, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not cache an unknown cache tier', async () => {
    const storage = createStorage()
    const request = createRequest()

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'nope' } as never, options)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'nope' } as never, options)

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('does not cache a response that carries errors', async () => {
    const storage = createStorage()
    const request = vi.fn(async () => ({ data: undefined, errors: { message: 'boom' }, headers: new Headers() }))

    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)
    await useCache(storage, request as never, 'query X { a }' as never, { cache: 'short' } as never, options)

    expect(request).toHaveBeenCalledTimes(2)
    expect(store.size).toBe(0)
  })

  it('asks the proxy for the same tier it caches under', async () => {
    const request = createRequest()

    await useCache(createStorage(), request as never, 'query X { a }' as never, { cache: 'long' } as never, options)

    expect(requestOptions(request)).toMatchObject({ headers: { 'X-Shopify-Proxy-Cache': 'long' } })
  })

  it('supports split client and proxy cache tiers', async () => {
    const request = createRequest()

    await useCache(
      createStorage(),
      request as never,
      'query X { a }' as never,
      { cache: { client: 'short', proxy: 'long' } } as never,
      options,
    )

    expect(requestOptions(request)).toMatchObject({ headers: { 'X-Shopify-Proxy-Cache': 'long' } })
    expect([...ttls.values()]).toStrictEqual([{ ttl: 10_000 }])
  })
})
