import { readValidatedBody, getRequestHeaders } from 'h3'
import { defineCachedEventHandler, useStorage } from 'nitropack/runtime'
import { hash } from 'ohash'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { createStorefrontConfig } from '../../../utils/clients/storefront'

const cacheOptions = {
    short: {
        maxAge: 10,
    },
    long: {
        maxAge: 86400,
    },
}

export default defineCachedEventHandler(async (event) => {
    const schema = z.object({
        query: z.string(),
        variables: z.record(z.string(), z.unknown()).optional(),
    })

    const body = await readValidatedBody(event, schema.parse)

    const headers = getRequestHeaders(event) as Record<string, string>

    const { _shopify } = useRuntimeConfig()

    const { apiUrl } = createStorefrontConfig(_shopify)

    const cacheConfig = typeof _shopify?.clients?.storefront?.proxy === 'object'
        ? _shopify.clients.storefront.proxy.cache
        : undefined

    const storage = _shopify?.clients?.storefront?.proxy !== false && headers['x-shopify-proxy-cache']
        ? useStorage(typeof cacheConfig === 'string' ? cacheConfig : 'shopify-storefront')
        : undefined

    const cacheKey = hash(body)

    if (storage) {
        if (await storage.hasItem(cacheKey)) {
            return await storage.getItem(cacheKey)
        }
    }

    const response = await $fetch<object>(apiUrl, {
        method: event.method,
        headers,
        body,
    })

    if (storage && headers['x-shopify-proxy-cache'] && headers['x-shopify-proxy-cache'] in cacheOptions) {
        const config = cacheOptions[headers['x-shopify-proxy-cache'] as keyof typeof cacheOptions]

        await storage.setItem(cacheKey, response, {
            maxAge: config.maxAge,
        })
    }

    return response
}, {
    base: (() => {
        const { _shopify } = useRuntimeConfig()

        return _shopify?.clients?.storefront?.proxy !== false
            ? _shopify?.clients.storefront?.proxy?.path || '_proxy/storefront'
            : undefined
    })(),

    shouldBypassCache: (event) => {
        const { _shopify } = useRuntimeConfig(event)

        console.log(_shopify)

        return true
    },
})
