import type {
    StorefrontApiClient,
    StorefrontOperations,
} from '#shopify/clients/storefront'
import type { GenericApiClientConfig } from '../../../types'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createApiUrl, createStoreDomain, createClient } from '../../utils/client'
import useErrors from './useErrors'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const nitroApp = useNitroApp()

    const {
        name,
        logger,

        clients: {
            storefront: {
                apiVersion,
                headers,

                mock,
                publicAccessToken,
                privateAccessToken,
            },
        },
    } = _shopify

    if ((!publicAccessToken && !privateAccessToken) || (publicAccessToken && privateAccessToken)) {
        throw new Error('Could not create storefront client')
    }

    const clientOptions = {
        storeDomain: createStoreDomain(name),
        apiUrl: mock ? createApiUrl('https://mock.shop', apiVersion) : createApiUrl(createStoreDomain(name), apiVersion),
        apiVersion,
        logger,
        headers: {
            ...(publicAccessToken ? { 'X-Shopify-Storefront-Access-Token': publicAccessToken } : {}),
            ...(privateAccessToken ? { 'Shopify-Private-Access-Token': privateAccessToken } : {}),
            ...headers,
        },
    } satisfies GenericApiClientConfig

    nitroApp.hooks.callHook('storefront:client:configure', { options: clientOptions })

    const originalClient = createClient<StorefrontOperations>(clientOptions)

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nitroApp.hooks.callHook('storefront:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        nitroApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nitroApp.hooks.callHook('storefront:client:create', { client })

    return client
}
