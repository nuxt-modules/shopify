import type { CustomFetchApi } from '@shopify/graphql-client'
import type { H3Event } from 'h3'
import type { StorageValue } from 'unstorage'

import { Cache, createFetchWithCache } from '@shopify/hydrogen'
import { useStorage } from 'nitropack/runtime'

import { useRuntimeConfig } from '#imports'
import { MUTATION } from '../../../utils/clients/cache'
import {
  BUYER_IP_HEADER,
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
  SERVER_CACHE_HEADER,
} from '../../../utils/clients/transport'

const DEFAULT_SERVER_CACHE_BASE = 'storefront-cache'

const VISITOR_HEADERS = ['accept-language', 'cookie', BUYER_IP_HEADER]

function hasData(body: unknown): boolean {
  return typeof body === 'object' && body !== null && !Array.isArray(body) && !('errors' in body)
}

export function createStorefrontServerCache(event: H3Event): CustomFetchApi {
  const cacheConfig = useRuntimeConfig(event)._shopify?.clients.storefront?.cache || undefined

  const storage = useStorage(typeof cacheConfig?.server === 'string' ? cacheConfig.server : DEFAULT_SERVER_CACHE_BASE)

  const fetchWithCache = createFetchWithCache({
    cache: {
      get: key => storage.getItem(key),
      set: (key, value, options) => storage.setItem(key, value as StorageValue, options),
      delete: (key: string) => storage.removeItem(key),
    },
    waitUntil: promise => event.waitUntil(promise),
  })

  return async (url, init = {}) => {
    const headers = new Headers(init.headers)
    const preset = headers.get(SERVER_CACHE_HEADER)

    headers.delete(SERVER_CACHE_HEADER)

    const options = preset && cacheConfig?.presets && Object.hasOwn(cacheConfig.presets, preset) ? cacheConfig.presets[preset] : undefined

    if (!options || typeof init.body !== 'string' || MUTATION.test(JSON.parse(init.body).query)) return await fetch(url, { ...init, headers })

    for (const name of VISITOR_HEADERS) headers.delete(name)

    return await fetchWithCache(url, { ...init, headers }, {
      key: ['storefront-api', url, init.body, preset, headers.get(PUBLIC_TOKEN_HEADER), headers.get(PRIVATE_TOKEN_HEADER)],
      strategy: Cache(options),
      shouldCacheResponse: async ({ json }) => hasData(await json?.().catch(() => undefined)),
    })
  }
}
