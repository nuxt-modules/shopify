import type { LRUCache } from 'lru-cache'

import { createStorage } from 'unstorage'
import { describe, expect, it } from 'vitest'

import lruCacheDriver from '#src/runtime/utils/lru-driver'

function create(options: Parameters<typeof lruCacheDriver>[0] = {}) {
  const storage = createStorage({ driver: lruCacheDriver(options) })

  return { storage, cache: storage.getMount().driver.getInstance!() as LRUCache<string, object | string> }
}

describe('lru cache driver', () => {
  it('keeps an entry for its ttl in seconds, as every unstorage driver does', async () => {
    const { storage, cache } = create()

    await storage.setItem('item', 'value', { ttl: 5 })
    await storage.setItemRaw('raw', { value: 1 }, { ttl: 5 })

    for (const key of ['item', 'raw']) {
      expect(cache.getRemainingTTL(key)).toBeGreaterThan(4_000)
      expect(cache.getRemainingTTL(key)).toBeLessThanOrEqual(5_000)
    }
  })

  it('keeps an entry without a ttl of its own for the `ttl` option in seconds', async () => {
    const { storage, cache } = create({ ttl: 10 })

    await storage.setItem('item', 'value')

    expect(cache.getRemainingTTL('item')).toBeGreaterThan(9_000)
    expect(cache.getRemainingTTL('item')).toBeLessThanOrEqual(10_000)
  })
})
