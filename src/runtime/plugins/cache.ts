import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
    const runtimeConfig = useRuntimeConfig()

    const storefrontCache = runtimeConfig._shopify?.clients.storefront?.cache?.client

    const isActive = storefrontCache !== false
    const config = typeof storefrontCache === 'object' ? storefrontCache : undefined

    const storage = isActive
        ? createStorage({
                driver: lruCacheDriver({
                    max: config?.max || 1000, // 1000 items
                    maxSize: config?.maxSize || 1024 * 1024, // 1 MB
                    maxEntrySize: config?.maxEntrySize || 100 * 1024, // 100 KB
                    ttl: config?.ttl || 1000 * 60 * 60, // 1 hour
                }),
            })
        : undefined

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
