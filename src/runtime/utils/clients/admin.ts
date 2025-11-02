import type { ShopifyApiClientConfig, ShopifyConfig } from '../../../types'

import { createApiUrl, createStoreDomain } from '../client'

export const createAdminConfig = (config?: Partial<ShopifyConfig>): ShopifyApiClientConfig => {
    if (!config?.name || !config.clients?.admin || !config.clients.admin?.accessToken) {
        throw new Error('Could not create admin client')
    }

    const {
        name,
        logger,

        clients: {
            admin: {
                apiVersion,
                headers,

                accessToken,
            },
        },
    } = config

    return {
        storeDomain: createStoreDomain(name),
        apiUrl: createApiUrl(createStoreDomain(name), apiVersion, 'admin'),
        apiVersion,
        logger,
        headers: {
            'X-Shopify-Access-Token': accessToken,
            ...headers,
        },
    } satisfies ShopifyApiClientConfig
}
