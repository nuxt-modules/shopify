import type { AllOperations, ClientResponse, ReturnData } from '@shopify/graphql-client'
import type { CacheOptions } from '@shopify/hydrogen'
import type { Storage, StorageValue } from 'unstorage'

import type {
  ShopifyApiClientRequest,
  ShopifyApiClientRequestOptions,
} from '../../../module'

import { Cache } from '@shopify/hydrogen'
import { hash } from 'ohash'

import { SERVER_CACHE_HEADER } from './transport'

type CachePresets = Record<string, CacheOptions>

type RequestCache = {
  storage?: Storage<StorageValue>
  presets?: CachePresets
  serverCache: boolean
}

export const MUTATION = /\bmutation\b/

function fromPreset(name: string, cachePresets?: CachePresets) {
  const preset = cachePresets?.[name]

  if (!preset) return undefined

  const { maxAge = 0, staleWhileRevalidate = 0 } = Cache(preset)

  const ttl = (maxAge + staleWhileRevalidate) * 1000

  return ttl > 0 ? { ttl } : undefined
}

function getBrowserCacheOptions<
  Operation extends keyof Operations,
  Operations extends AllOperations,
>(
  options?: ShopifyApiClientRequestOptions<Operation, Operations, true>,
  cachePresets?: CachePresets,
) {
  if (typeof options?.cache === 'string') {
    return fromPreset(options.cache, cachePresets)
  }
  else if (typeof options?.cache === 'object') {
    if (typeof options.cache.browser === 'string') {
      return fromPreset(options.cache.browser, cachePresets)
    }
    else if (typeof options.cache.browser === 'object') return options.cache.browser
  }
}

function getServerCacheHeaders<
  Operation extends keyof Operations,
  Operations extends AllOperations,
>(options?: ShopifyApiClientRequestOptions<Operation, Operations, true>) {
  if (typeof options?.cache === 'string') {
    return { [SERVER_CACHE_HEADER]: options.cache }
  }
  else if (typeof options?.cache === 'object' && typeof options.cache.server === 'string') {
    return { [SERVER_CACHE_HEADER]: options.cache.server }
  }
}

function createCacheKey<
  Operation extends keyof Operations,
  Operations extends AllOperations,
>(
  operation: Operation,
  options?: ShopifyApiClientRequestOptions<Operation, Operations, true>,
) {
  const keyableOptions = { ...options }

  delete keyableOptions.signal

  return hash({ operation, options: keyableOptions })
}

function detach<Data>(response: ClientResponse<Data>): ClientResponse<Data> {
  return { ...response, ...(response.data ? { data: structuredClone(response.data) } : {}) }
}

export async function requestWithCache<
  Operation extends keyof Operations,
  Operations extends AllOperations,
  Cache extends boolean | undefined,
>(
  { storage, presets, serverCache }: RequestCache,
  request: ShopifyApiClientRequest<Operations, Cache>,
  operation: Operation,
  options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>,
): Promise<ClientResponse<ReturnData<Operation, Operations>>> {
  const browserCacheOptions = storage && !MUTATION.test(operation as string) ? getBrowserCacheOptions(options, presets) : undefined
  const serverCacheHeaders = serverCache ? getServerCacheHeaders(options) : undefined

  const cacheKey = storage && browserCacheOptions ? createCacheKey(operation, options) : undefined

  if (storage && cacheKey) {
    const cached = await storage.getItemRaw(cacheKey) as ClientResponse<ReturnData<Operation, Operations>> | null

    if (cached) return detach(cached)
  }

  const response = await request(operation, {
    ...options,
    headers: {
      ...options?.headers,
      ...serverCacheHeaders,
    },
  } as typeof options)

  if (storage && cacheKey && !response.errors) {
    await storage.setItemRaw(cacheKey, detach(response), browserCacheOptions)
  }

  return response
}
