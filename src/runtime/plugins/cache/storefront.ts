import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
    const runtimeConfig = useRuntimeConfig()

    const storefrontConfig = runtimeConfig._shopify?.clients.storefront
    const storefrontCache = storefrontConfig?.cache && storefrontConfig.cache.client ? storefrontConfig.cache.client : undefined

    const config = typeof storefrontCache === 'object' ? storefrontCache : undefined

    const storage = createStorage({
        driver: lruCacheDriver({
            ...(config?.max ? { max: config?.max } : {}),
            ...(config?.maxSize ? { maxSize: config?.maxSize } : {}),
            ...(config?.maxEntrySize ? { maxEntrySize: config?.maxEntrySize } : {}),
            ...(config?.ttl ? { ttl: config?.ttl } : {}),
        }),
    })

    return {
        provide: {
            shopify: {
                cache: {
                    storefront: storage,
                },
            },
        },
    }
})
