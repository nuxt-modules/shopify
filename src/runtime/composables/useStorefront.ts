import type { StorefrontApiClient } from '@shopify/storefront-api-client'

import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'

import useErrors from './useErrors'

import { useRuntimeConfig, useNuxtApp } from '#imports'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const nuxtApp = useNuxtApp()

    const {
        ...options
    } = _shopify.clients.storefront

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    nuxtApp.hooks.callHook('storefront:client:configure', { options })

    const originalClient = createStorefrontApiClient(options)

    const request: StorefrontApiClient['request'] = async (...params) => {
        nuxtApp.hooks.callHook('storefront:client:request', { operation: params[0], options: params[1] })

        const response = await originalClient.request(...params)

        if (response.errors) useErrors(nuxtApp, response.errors, _shopify.errors?.throw ?? false)

        nuxtApp.hooks.callHook('storefront:client:response', { response, operation: params[0], options: params[1] })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
