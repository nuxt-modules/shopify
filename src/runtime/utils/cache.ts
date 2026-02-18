import type { AllOperations, ClientResponse, ReturnData } from '@shopify/graphql-client'
import type { Storage, StorageValue } from 'unstorage'

import type {
    ShopifyApiClientRequest,
    ShopifyApiClientRequestOptions,
} from '../../types/client'

import { hash } from 'ohash'

import { stringToCacheConfig } from '../../utils/cache'

function getLRUCacheSettings<
    Operation extends keyof Operations,
    Operations extends AllOperations,
>(options?: ShopifyApiClientRequestOptions<Operation, Operations, true>) {
    if (typeof options?.cache === 'string') {
        return stringToCacheConfig(options.cache)
    }
    else if (typeof options?.cache === 'object') {
        if (typeof options.cache.client === 'string') {
            return stringToCacheConfig(options.cache.client)
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
): Promise<ClientResponse<ReturnData<Operation, Operations>>> {
    const inMemoryConfig = getLRUCacheSettings(options)
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
