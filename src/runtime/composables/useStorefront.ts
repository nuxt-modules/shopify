import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig, useNuxtApp } from '#imports'

export function useStorefront() {
    const options = useRuntimeConfig().public?._shopify

    if (!options) {
        throw new Error('Could not create storefront client')
    }

    useNuxtApp().hooks.callHook('storefront:client:configure', { options })

    const client = createStorefrontApiClient(options)

    useNuxtApp().hooks.callHook('storefront:client:create', { client })

    return client
}
