import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { ClientResponse, ReturnData } from '@shopify/graphql-client'

import { joinURL } from 'ufo'
import { hash } from 'ohash'

import { useRuntimeConfig, useNuxtApp, useRequestURL } from '#imports'
import { createClient } from '../utils/client'
import { createStorefrontConfig } from '../utils/clients/storefront'
import useErrors from '../utils/errors'

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

    const cache = nuxtApp.$shopify?.cache?.storefront

    const request: StorefrontApiClient['request'] = async (operation, options) => {
        nuxtApp.hooks.callHook('storefront:client:request', { operation, options })

        let ttl: number | undefined
        let cacheKey: string | undefined
        let shouldBypass: boolean | undefined
        let shouldInvalidate: boolean | undefined

        if (options?.cache) {
            if (typeof options.cache === 'object') {
                ttl = options.cache.ttl

                cacheKey = options.cache.getKey
                    ? options.cache.getKey(operation, options)
                    : hash({ operation, options })

                shouldBypass = options.cache.bypass?.(operation, options)
                shouldInvalidate = options.cache.invalidate?.(operation, options)

                if (shouldInvalidate) await cache?.remove(cacheKey!)
            }
            else {
                cacheKey = hash({ operation, options })
            }
        }

        if (cacheKey && cache && !shouldBypass && !shouldInvalidate) {
            const cachedResponse = await cache.getItem<ClientResponse<ReturnData<typeof operation, StorefrontOperations>>>(
                cacheKey,
                { ttl },
            )

            if (cachedResponse) {
                nuxtApp.hooks.callHook('storefront:client:response', { response: cachedResponse, operation, options })

                return cachedResponse
            }
        }

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nuxtApp.hooks, 'storefront:client:errors', response.errors, _shopify?.errors?.throw ?? false)

        if (cacheKey && cache && !shouldBypass) {
            await cache.setItem(cacheKey, response, { ttl })
        }

        nuxtApp.hooks.callHook('storefront:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies StorefrontApiClient

    nuxtApp.hooks.callHook('storefront:client:create', { client })

    return client
}
