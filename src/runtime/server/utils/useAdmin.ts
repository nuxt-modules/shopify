import type {
    AdminApiClient,
    AdminOperations,
} from '#shopify/clients/admin'
import type { GenericApiClientConfig } from '../../../types'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createApiUrl, createClient, createStoreDomain } from '../../utils/client'
import useErrors from './useErrors'

export function useAdmin(): AdminApiClient {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.admin || !_shopify?.clients.admin?.accessToken) {
        throw new Error('Could not create admin client')
    }

    const nitroApp = useNitroApp()

    const {
        name,
        logger,

        clients: {
            admin: {
                apiVersion,
                headers,

                accessToken,
            },
        },
    } = _shopify

    const clientOptions = {
        apiUrl: createApiUrl(createStoreDomain(name), apiVersion),
        apiVersion,
        logger,
        headers: {
            'X-Shopify-Access-Token': accessToken,
            ...headers,
        },
    } satisfies GenericApiClientConfig

    nitroApp.hooks.callHook('admin:client:configure', { options: clientOptions })

    const originalClient = createClient<AdminOperations>(clientOptions)

    const request: AdminApiClient['request'] = async (operation, options) => {
        nitroApp.hooks.callHook('admin:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        nitroApp.hooks.callHook('admin:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies AdminApiClient

    nitroApp.hooks.callHook('admin:client:create', { client })

    return client
}
