import type { AdminOperations } from '@shopify/admin-api-client'
import type { StorefrontOperations } from '@shopify/storefront-api-client'

import { useFetch } from '#imports'

type ShopifyOperations = {
    '/api/admin': AdminOperations
    '/api/storefront': StorefrontOperations
}

export function useShopify() {
    const request = <T extends keyof ShopifyOperations>(url: T) => async <O extends keyof ShopifyOperations[T]>(
        operation: O,
        variables: ShopifyOperations[T][O]['variables'],
    ) => {
        const { data, error } = await useFetch(url, {
            body: JSON.stringify({ operation, variables }),
        })

        if (error.value) throw error.value
        if (!data.value) throw new Error('No data returned')

        return data.value as ShopifyOperations[T][O]['return']
    }

    return {
        storefront: {
            request: request('/api/storefront'),
        },
        admin: {
            request: request('/api/admin'),
        },
    }
}
