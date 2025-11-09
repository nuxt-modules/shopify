import { useRuntimeConfig, defineNitroPlugin } from 'nitropack/runtime'
import { createCache } from '../../utils/cache'

export default defineNitroPlugin(() => {
    const { _shopify } = useRuntimeConfig()

    const adminCache = createCache(_shopify?.clients?.admin?.cache)
    const storefrontCache = createCache(_shopify?.clients?.storefront?.cache)

    return {
        provide: {
            shopify: {
                cache: {
                    admin: adminCache,
                    storefront: storefrontCache,
                },
            },
        },
    }
})
