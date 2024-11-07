import { createAdminApiClient } from '@shopify/admin-api-client'

import { defineNitroPlugin, useRuntimeConfig } from '#imports'

export default defineNitroPlugin(async (nitro) => {
    const { _shopify } = useRuntimeConfig()

    await nitro.hooks.callHook(
        'shopify:admin:init',
        _shopify.clients.admin,
    )

    return {
        provide: {
            admin: createAdminApiClient(
                _shopify.clients.admin,
            ),
        },
    }
})
