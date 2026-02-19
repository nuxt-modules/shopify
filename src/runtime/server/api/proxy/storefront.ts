import { defineEventHandler, readValidatedBody, getRequestHeaders } from 'h3'
import { defineCachedFunction } from 'nitropack/runtime'
import { hash } from 'ohash'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { createStorefrontConfig } from '../../../utils/clients/storefront'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        query: z.string(),
        variables: z.record(z.string(), z.unknown()).optional(),
    })

    const body = await readValidatedBody(event, schema.parse)

    const headers = getRequestHeaders(event) as Record<string, string>

    const { _shopify } = useRuntimeConfig()

    const { apiUrl } = createStorefrontConfig(_shopify)

    const cacheOption = headers['x-shopify-proxy-cache'] ?? 'none'

    const cacheConfig = typeof _shopify?.clients?.storefront?.proxy === 'object'
        ? _shopify.clients.storefront.proxy.cache
        : undefined

    const requestCacheConfig = cacheConfig?.options
        ? cacheOption in cacheConfig.options
            ? cacheConfig.options[cacheOption]
            : undefined
        : undefined

    const cacheBase = typeof cacheConfig?.storage === 'string' ? cacheConfig.storage : cacheConfig?.storage?.base

    const cachedProxyRequest = defineCachedFunction(async (
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE',
        headers: Record<string, string>,
        body: Record<string, unknown> | string,
    ) => {
        return await $fetch<object>(url, { method, headers, body })
    }, {
        name: 'storefront-proxy',

        shouldBypassCache: () => !requestCacheConfig,
        getKey: (_url, _method, _headers, body) => hash(body),

        ...(cacheBase ? { base: cacheBase } : {}),
        ...requestCacheConfig,
    })

    return await cachedProxyRequest(apiUrl, event.method, headers, body)
})
