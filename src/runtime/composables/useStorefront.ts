import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'

import useErrors from './useErrors'

import { useRuntimeConfig, useNuxtApp } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const {
        ...options
    } = _shopify.clients.storefront

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    const nuxtApp = useNuxtApp()

    nuxtApp.hooks.callHook('storefront:client:configure', { options })

    const { request, ...rest } = createStorefrontApiClient(options)

    const wrappedRequest: ReturnType<typeof createStorefrontApiClient>['request'] = async (...params) => {
        const response = await request(...params)

        if (response.errors) useErrors(nuxtApp, response.errors, _shopify.errors?.throw ?? false)

        return response
    }

    const client = { request: wrappedRequest, ...rest }

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
