import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig()
    const config = _shopify?.clients.storefront

    if (!config) return

    return createStorefrontApiClient(config)
}
