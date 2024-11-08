import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { createAdminApiClient } from '@shopify/admin-api-client'
import { useRuntimeConfig, useNitroApp } from '#imports'

export function useShopify() {
    const nitro = useNitroApp()
    const { _shopify } = useRuntimeConfig()

    const createStorefront = () => {
        if (!_shopify?.clients?.storefront) return

        nitro.hooks.callHook(
            'shopify:storefront:init',
            _shopify.clients.storefront,
        )

        return createStorefrontApiClient(
            _shopify.clients.storefront,
        )
    }

    const createAdmin = () => {
        if (!_shopify?.clients?.admin) return

        nitro.hooks.callHook(
            'shopify:storefront:init',
            _shopify.clients.admin,
        )

        return createAdminApiClient(
            _shopify.clients.admin,
        )
    }
    return {
        storefront: createStorefront(),
        admin: createAdmin(),
    }
}
