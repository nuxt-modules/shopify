import { createAdminApiClient } from '@shopify/admin-api-client'

import { useRuntimeConfig, useNitroApp } from '#imports'

export function useAdmin() {
    const nitro = useNitroApp()
    const { _shopify } = useRuntimeConfig()

    if (!_shopify?.clients?.admin) return

    nitro.hooks.callHook(
        'shopify:admin:init',
        _shopify.clients.admin,
    )

    return createAdminApiClient(
        _shopify.clients.admin,
    )
}
