import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createClient } from '../../utils/client'
import { createStorefrontConfig } from '../../utils/storefront'
import useErrors from '../../utils/errors'

export function useStorefront(): StorefrontApiClient {
    const { _shopify } = useRuntimeConfig()

    const config = createStorefrontConfig(_shopify)

    const nitroApp = useNitroApp()

    nitroApp.hooks.callHook('storefront:client:configure', { config })

    const originalClient = createClient<StorefrontOperations>(config)

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nitroApp.hooks.callHook('storefront:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nitroApp.hooks, 'storefront:client:errors', response.errors, _shopify?.errors?.throw ?? false)

        nitroApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nitroApp.hooks.callHook('storefront:client:create', { client })

    return client
}
