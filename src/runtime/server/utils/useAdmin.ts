import type { AdminApiClient } from '@shopify/admin-api-client'

import { createAdminApiClient } from '@shopify/admin-api-client'
import { createConsola } from 'consola'
import { useNitroApp } from 'nitropack/runtime'

import useErrors from './useErrors'

import { useRuntimeConfig } from '#imports'

export function useAdmin(): AdminApiClient {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.admin) {
        throw new Error('Could not create admin client')
    }

    const nitroApp = useNitroApp()

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = _shopify.clients.admin

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    nitroApp.hooks.callHook('admin:client:configure', { options })

    const originalClient = createAdminApiClient(options)

    const request: AdminApiClient['request'] = async (...params) => {
        nitroApp.hooks.callHook('admin:client:request', { operation: params[0], options: params[1] })

        const response = await originalClient.request(...params)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        return response
    }

    const client = { ...originalClient, request } satisfies AdminApiClient

    nitroApp.hooks.callHook('admin:client:create', { client })

    return client
}
