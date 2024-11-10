import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { useRuntimeConfig, useNitroApp } from '#imports'

export async function useStorefront() {
    const nitro = useNitroApp()
    const { _shopify } = useRuntimeConfig()

    const config = _shopify.clients.storefront
    if (!config) return

    if (config.private) {
        config.privateAccessToken = config.accessToken
    }
    else {
        config.publicAccessToken = config.accessToken
    }

    await nitro.hooks.callHook(
        'shopify:storefront:init',
        config,
    )

    return createStorefrontApiClient(
        config,
    )
}
