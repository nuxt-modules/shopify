import { createAdminApiClient } from '@shopify/admin-api-client'

import { useRuntimeConfig } from '#imports'

export function useAdmin() {
    const { _shopify } = useRuntimeConfig()
    const config = _shopify?.clients.admin

    if (!config) return
    if (config.storeDomain === undefined) return

    return createAdminApiClient({
        storeDomain: config.storeDomain,
        apiVersion: config.apiVersion,
        retries: config.retries,
        customFetchApi: config.customFetchApi,
        logger: config.logger,
        accessToken: config.accessToken,
    })
}
