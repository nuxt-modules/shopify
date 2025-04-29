import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'

import { useRuntimeConfig, useNuxtApp } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const {
        ...options
    } = _shopify.clients.storefront

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('nuxt-shopify').log
    }

    useNuxtApp().hooks.callHook('storefront:client:configure', { options })

    const client = createStorefrontApiClient(options)

    useNuxtApp().hooks.callHook('storefront:client:create', { client })

    return client
}
