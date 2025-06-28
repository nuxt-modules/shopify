import { type StorefrontApiClient, createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'
import { useNitroApp } from 'nitropack/runtime'

import useErrors from './useErrors'

import { useRuntimeConfig } from '#imports'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = _shopify.clients.storefront

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    const nitroApp = useNitroApp()

    nitroApp.hooks.callHook('storefront:client:configure', { options })

    const { request, ...rest } = createStorefrontApiClient(options)

    const wrappedRequest: StorefrontApiClient['request'] = async (...params) => {
        const response = await request(...params)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        return response
    }

    const client = { request: wrappedRequest, ...rest }

    nitroApp.hooks.callHook('storefront:client:create', { client })

    return client
}
