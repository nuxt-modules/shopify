import type { StorefrontApiClient } from '@shopify/storefront-api-client'

import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createConsola } from 'consola'
import { useNitroApp } from 'nitropack/runtime'

import useErrors from './useErrors'

import { useRuntimeConfig } from '#imports'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients.storefront) {
        throw new Error('Could not create storefront client')
    }

    const nitroApp = useNitroApp()

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = _shopify.clients.storefront

    if (_shopify.logger) {
        options.logger = createConsola(_shopify.logger).withTag('shopify').trace
    }

    nitroApp.hooks.callHook('storefront:client:configure', { options })

    const originalClient = createStorefrontApiClient(options)

    const request: StorefrontApiClient['request'] = async (...params) => {
        nitroApp.hooks.callHook('storefront:client:request', { operation: params[0], options: params[1] })

        const response = await originalClient.request(...params)

        if (response.errors) useErrors(nitroApp, response.errors, _shopify.errors?.throw ?? false)

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nitroApp.hooks.callHook('storefront:client:create', { client })

    return client
}
