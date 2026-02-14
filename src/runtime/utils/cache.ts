import type { AllOperations, ClientResponse, ReturnData } from '@shopify/graphql-client'
import type { Storage, StorageValue } from 'unstorage'

import type {
    ShopifyApiClientRequest,
    ShopifyApiClientRequestOptions,
} from '../../types/client'

import { hash } from 'ohash'

export default async function useCache<
    Request extends ShopifyApiClientRequest<Operations>,
    Operation extends keyof Operations,
    Operations extends AllOperations,
>(
    storage: Storage<StorageValue> | undefined,
    request: Request,
    operation: Operation,
    options?: ShopifyApiClientRequestOptions<Operation, Operations>,
): Promise<ClientResponse<ReturnData<Operation, Operations>>> {
    const shouldCache = storage && options?.cache

    const cacheKey = hash({ operation, options })

    if (shouldCache && await storage.hasItem(cacheKey)) {
        return await storage.getItem(cacheKey) as ClientResponse<ReturnData<Operation, Operations>>
    }

    const response = await request(operation, options)

    if (shouldCache) await storage.setItem(cacheKey, response)

    return response
}
