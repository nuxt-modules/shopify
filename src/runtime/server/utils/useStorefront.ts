import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = _shopify.clients.storefront

    return createStorefrontApiClient(options)
}
