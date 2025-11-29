import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import { joinURL } from 'ufo'

import { useRuntimeConfig, useNuxtApp, useRequestURL } from '#imports'
import { createClient } from '../utils/client'
import { createStorefrontConfig } from '../utils/clients/storefront'
import useErrors from '../utils/errors'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig().public

    const config = createStorefrontConfig(_shopify)

    const nuxtApp = useNuxtApp()

    if (_shopify?.clients.storefront?.proxy && !nuxtApp.payload.prerenderedAt) {
        config.apiUrl = joinURL(useRequestURL().origin, _shopify.clients.storefront.proxy)
    }

    nuxtApp.hooks.callHook('storefront:client:configure', { config })

    const originalClient = createClient<StorefrontOperations>(config)

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nuxtApp.hooks.callHook('storefront:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nuxtApp.hooks, 'storefront:client:errors', response.errors, _shopify?.errors?.throw ?? false)

        nuxtApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
