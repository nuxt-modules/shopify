import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig()
    const config = _shopify?.clients.storefront

    if (!config) {
        throw new Error('Could not create storefront client')
    }

    return createStorefrontApiClient(config)
}
