import type { AdminApiClient } from '@shopify/admin-api-client'

import { createAdminApiClient } from '@shopify/admin-api-client'
import { createConsola } from 'consola'
import { useNitroApp } from 'nitropack/runtime'

import useErrors from './useErrors'

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
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    const nitroApp = useNitroApp()

    nitroApp.hooks.callHook('admin:client:configure', { options })

    const { request, ...rest } = createAdminApiClient(options)

    const wrappedRequest: AdminApiClient['request'] = async (...params) => {
        const response = await request(...params)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        return response
    }

    const client = { request: wrappedRequest, ...rest }

    nitroApp.hooks.callHook('admin:client:create', { client })

    return client
}
