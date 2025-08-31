import type { StorefrontApiClient, StorefrontOperations } from '@konkonam/nuxt-shopify/storefront'

import { joinURL } from 'ufo'

import { useRuntimeConfig, useNuxtApp, useRequestURL } from '#imports'
import { createClient } from '../utils/clients'
import { createStorefrontConfig } from '../utils/clients/storefront'
import useErrors from './useErrors'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig().public

    const config = createStorefrontConfig(_shopify)

    const nuxtApp = useNuxtApp()

    if (_shopify?.clients.storefront?.proxy) {
        const proxyUrl = typeof _shopify.clients.storefront.proxy === 'string'
            ? _shopify.clients.storefront.proxy
            : '_proxy/storefront'

        config.apiUrl = joinURL(useRequestURL().origin, proxyUrl)
    }

    nuxtApp.hooks.callHook('storefront:client:configure', { config })

    const originalClient = createClient<StorefrontOperations>(config)

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nuxtApp.hooks.callHook('storefront:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nuxtApp, response.errors, _shopify?.errors?.throw ?? false)

        nuxtApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
