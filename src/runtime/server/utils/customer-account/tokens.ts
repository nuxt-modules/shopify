import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../../module'

import { useStorage } from 'nitropack/runtime'
import { hash } from 'ohash'

import { warnUnmountedStorage } from '../../../utils/storage'

const DEFAULT_TOKEN_STORAGE = 'customer-account-token'

type StoredTokens = {
  tokens: unknown
  replaces?: string[]
}

const tokenKeysWrittenBy = new WeakMap<H3Event, Set<string>>()

function getTokenStorage(config?: ShopifyConfig) {
  const tokenStorage = config?.clients?.customerAccount?.tokenStorage

  if (!tokenStorage) return undefined

  const base = typeof tokenStorage === 'string' ? tokenStorage : DEFAULT_TOKEN_STORAGE
  const storage = useStorage(base)

  warnUnmountedStorage(storage, base, config?.logger)

  return storage
}

export function createTokenStore(event: H3Event, config?: ShopifyConfig) {
  const storage = getTokenStorage(config)

  if (!storage) return undefined

  const maxAge = config?.clients?.customerAccount?.session?.maxAge
  const options = maxAge ? { ttl: maxAge } : undefined

  const written = tokenKeysWrittenBy.get(event) ?? new Set<string>()

  tokenKeysWrittenBy.set(event, written)

  return {
    async read(key: string) {
      const entry = await storage.getItem<StoredTokens>(key)

      if (!entry) return undefined

      if (entry.replaces?.length && !written.has(key)) {
        await Promise.all(entry.replaces.map(replaced => storage.removeItem(replaced)))
        await storage.setItem(key, { tokens: entry.tokens }, options)
      }

      return entry.tokens
    },

    async write(tokens: unknown, currentKey?: string) {
      const key = hash(tokens)

      if (key === currentKey) return key

      const current = currentKey ? await storage.getItem<StoredTokens>(currentKey) : null
      const replaces = currentKey ? [currentKey, ...current?.replaces ?? []] : []

      await storage.setItem(key, replaces.length ? { tokens, replaces } : { tokens }, options)

      written.add(key)

      return key
    },

    async remove(key: string) {
      const entry = await storage.getItem<StoredTokens>(key)

      await Promise.all([key, ...entry?.replaces ?? []].map(removed => storage.removeItem(removed)))
    },
  }
}
