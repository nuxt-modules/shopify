import { createStorefrontApiClient } from '@shopify/storefront-api-client'

import { useRuntimeConfig } from '#imports'

export function useStorefront() {
    const { _shopify } = useRuntimeConfig()
    const config = _shopify?.clients.storefront

    if (!config) return
    if (config.storeDomain === undefined) return

    return createStorefrontApiClient({
        storeDomain: config.storeDomain,
        apiVersion: config.apiVersion,
        retries: config.retries,
        customFetchApi: config.customFetchApi,
        logger: config.logger,
        ...config.private && { privateAccessToken: config.accessToken },
        ...!config.private && { publicAccessToken: config.accessToken },
    })
}
