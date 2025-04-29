import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'

import { useRuntimeConfig, useNitroApp } from '#imports'

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

    if (_shopify.logger !== undefined) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').log
    }

    useNitroApp().hooks.callHook('storefront:client:create', { options })

    const client = createStorefrontApiClient(options)

    useNitroApp().hooks.callHook('storefront:client:created', { client })

    return client
}
