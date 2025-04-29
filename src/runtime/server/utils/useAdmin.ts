import { createAdminApiClient } from '@shopify/admin-api-client'
import { createConsola } from 'consola'
import { useNitroApp } from 'nitropack/runtime'

import { useRuntimeConfig } from '#imports'

export function useAdmin() {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.admin) {
        throw new Error('Could not create admin client')
    }

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = _shopify.clients.admin

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').debug
    }

    useNitroApp().hooks.callHook('admin:client:configure', { options })

    const client = createAdminApiClient(options)

    useNitroApp().hooks.callHook('admin:client:create', { client })

    return client
}
