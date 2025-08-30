import type {
    GenericApiClientConfig,
} from '../../types'

import type { StorefrontApiClient, StorefrontOperations } from '#shopify/clients/storefront'

import { useRuntimeConfig, useNuxtApp } from '#imports'
import { createApiUrl, createStoreDomain, createClient } from '../utils/client'
import useErrors from './useErrors'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify?.clients.storefront || !_shopify?.clients.storefront?.publicAccessToken) {
        throw new Error('Could not create storefront client')
    }

    const nuxtApp = useNuxtApp()

    const {
        name,
        logger,

        clients: {
            storefront: {
                apiVersion,
                headers,

                mock,
                publicAccessToken,
            },
        },
    } = _shopify

    const clientOptions = {
        storeDomain: createStoreDomain(name),
        apiUrl: mock ? createApiUrl('https://mock.shop', apiVersion) : createApiUrl(createStoreDomain(name), apiVersion),
        apiVersion,
        logger,
        headers: {
            'X-Shopify-Storefront-Access-Token': publicAccessToken,
            ...headers,
        },
    } satisfies GenericApiClientConfig

    nuxtApp.hooks.callHook('storefront:client:configure', { options: clientOptions })

    const originalClient = createClient<StorefrontOperations>(clientOptions)

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nuxtApp.hooks.callHook('storefront:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nuxtApp, response.errors, _shopify.errors?.throw ?? false)

        nuxtApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
