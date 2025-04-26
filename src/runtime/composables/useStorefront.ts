import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify) {
        throw new Error('Could not create storefront client')
    }

    return createStorefrontApiClient(_shopify)
}
