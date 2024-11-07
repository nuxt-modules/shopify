import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { defineNitroPlugin, useRuntimeConfig } from '#imports'

export default defineNitroPlugin(async (nitro) => {
    const { _shopify } = useRuntimeConfig()

    await nitro.hooks.callHook(
        'shopify:storefront:init',
        _shopify.clients.storefront,
    )

    return {
        provide: {
            storefront: createStorefrontApiClient(
                _shopify.clients.storefront,
            ),
        },
    }
})
