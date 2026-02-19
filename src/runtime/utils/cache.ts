import type { AllOperations, ClientResponse, ReturnData } from '@shopify/graphql-client'
import type { Storage, StorageValue } from 'unstorage'
import type { CacheOptions } from 'nitropack'

import type {
    ShopifyApiClientRequest,
    ShopifyApiClientRequestOptions,
} from '../../types/client'

import { hash } from 'ohash'

function getLRUCacheSettings<
    Operation extends keyof Operations,
    Operations extends AllOperations,
>(options?: ShopifyApiClientRequestOptions<Operation, Operations, true>, cacheOptions?: Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>>) {
    if (typeof options?.cache === 'string' && cacheOptions?.[options.cache]) {
        return {
            ttl: (cacheOptions[options.cache]!.maxAge ?? 0) + (cacheOptions[options.cache]!.staleMaxAge ?? 0),
        }
    }
    else if (typeof options?.cache === 'object') {
        if (typeof options.cache.client === 'string' && cacheOptions?.[options.cache.client]) {
            return {
                ttl: (cacheOptions[options.cache.client]!.maxAge ?? 0) + (cacheOptions[options.cache.client]!.staleMaxAge ?? 0),
            }
        }
        else if (typeof options.cache.client === 'object') return options.cache.client
    }
}

function getProxyCacheHeaders<
    Operation extends keyof Operations,
    Operations extends AllOperations,
>(options?: ShopifyApiClientRequestOptions<Operation, Operations, true>) {
    if (typeof options?.cache === 'string') {
        return { 'X-Shopify-Proxy-Cache': options.cache }
    }
    else if (typeof options?.cache === 'object' && typeof options.cache.proxy === 'string') {
        return { 'X-Shopify-Proxy-Cache': options.cache.proxy }
    }
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
    cacheOptions?: Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>>,
): Promise<ClientResponse<ReturnData<Operation, Operations>>> {
    const inMemoryConfig = getLRUCacheSettings(options, cacheOptions)
    const proxyCacheHeaders = getProxyCacheHeaders(options)

    const cacheKey = hash({ operation, options })

    if (storage && inMemoryConfig && await storage.hasItem(cacheKey)) {
        return await storage.getItem(cacheKey) as ClientResponse<ReturnData<Operation, Operations>>
    }

    const response = await request(operation, {
        ...options,
        headers: {
            ...options?.headers,
            ...proxyCacheHeaders,
        },
    } as typeof options)

    if (storage && inMemoryConfig) {
        const cacheConfig = typeof options?.cache === 'object' ? options.cache : undefined

        await storage.setItem(cacheKey, response, cacheConfig)
    }

    return response
}
