import { createAdminApiClient } from '@shopify/admin-api-client'

import { useRuntimeConfig } from '#imports'

export function useAdmin() {
    const { _shopify } = useRuntimeConfig()
    const config = _shopify?.clients.admin

    if (!config) {
        throw new Error('Could not create admin client')
    }

    return createAdminApiClient(config)
}
