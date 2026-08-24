import type { AllOperations, ClientResponse, ReturnData } from '@shopify/graphql-client'
import type { Storage, StorageValue } from 'unstorage'
import type { CacheOptions } from 'nitropack'

import type {
  ShopifyApiClientRequest,
  ShopifyApiClientRequestOptions,
} from '../../../module'

import { createConsola } from 'consola'
import { hash } from 'ohash'

import { PROXY_CACHE_HEADER } from './transport'

type CachePresets = Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>>

const reportedPresets = new Set<string>()

export function reportUnknownCachePreset(name: string, presets?: CachePresets) {
  if (name === 'none' || reportedPresets.has(name)) return

  reportedPresets.add(name)

  const available = Object.keys(presets ?? {})

  createConsola().withTag('shopify').warn(
    `Unknown cache preset \`${name}\`, this request is not cached. `
    + (available.length
      ? `Available presets: \`${available.join('`, `')}\``
      : 'No cache presets are configured'),
  )
}

function toCacheTtl(maxAge: number, staleMaxAge: number) {
  const ttl = maxAge * 1000 + staleMaxAge * 1000

  return ttl > 0 ? { ttl } : undefined
}

function fromPreset(name: string, cachePresets?: CachePresets) {
  const preset = cachePresets?.[name]

  if (!preset) {
    reportUnknownCachePreset(name, cachePresets)

    return undefined
  }

  return toCacheTtl(preset.maxAge ?? 0, preset.staleMaxAge ?? 0)
}

function getLRUCacheSettings<
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
    if (typeof options.cache.client === 'string') {
      return fromPreset(options.cache.client, cachePresets)
    }
    else if (typeof options.cache.client === 'object') return options.cache.client
  }
}

function getProxyCacheHeaders<
  Operation extends keyof Operations,
  Operations extends AllOperations,
>(options?: ShopifyApiClientRequestOptions<Operation, Operations, true>) {
  if (typeof options?.cache === 'string') {
    return { [PROXY_CACHE_HEADER]: options.cache }
  }
  else if (typeof options?.cache === 'object' && typeof options.cache.proxy === 'string') {
    return { [PROXY_CACHE_HEADER]: options.cache.proxy }
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

export default async function useCache<
  Request extends ShopifyApiClientRequest<Operations, true>,
  Operation extends keyof Operations,
  Operations extends AllOperations,
>(
  storage: Storage<StorageValue> | undefined,
  request: Request,
  operation: Operation,
  options?: ShopifyApiClientRequestOptions<Operation, Operations, true>,
  cachePresets?: CachePresets,
): Promise<ClientResponse<ReturnData<Operation, Operations>>> {
  const inMemoryConfig = storage ? getLRUCacheSettings(options, cachePresets) : undefined
  const proxyCacheHeaders = getProxyCacheHeaders(options)

  const cacheKey = storage && inMemoryConfig ? createCacheKey(operation, options) : undefined

  if (storage && cacheKey && await storage.hasItem(cacheKey)) {
    return detach(await storage.getItemRaw(cacheKey) as ClientResponse<ReturnData<Operation, Operations>>)
  }

  const response = await request(operation, {
    ...options,
    headers: {
      ...options?.headers,
      ...proxyCacheHeaders,
    },
  } as typeof options)

  if (storage && cacheKey && !response.errors) {
    await storage.setItemRaw(cacheKey, detach(response), inMemoryConfig)
  }

  return response
}
