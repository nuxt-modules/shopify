import { useRuntimeConfig, defineNuxtPlugin } from '#app'
import { createCache } from '../utils/cache'

export default defineNuxtPlugin(() => {
    const { _shopify } = useRuntimeConfig().public

    const storefrontCache = createCache(_shopify?.clients?.storefront?.cache)

    return {
        provide: {
            shopify: {
                cache: {
                    storefront: storefrontCache,
                },
            },
        },
    }
})
