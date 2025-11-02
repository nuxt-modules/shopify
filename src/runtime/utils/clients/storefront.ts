import type { PublicShopifyConfig, ShopifyApiClientConfig, ShopifyConfig } from '../../../types'

import { createApiUrl, createStoreDomain } from '../client'

const MOCK_STORE_DOMAIN = 'https://mock.shop'

export const createStorefrontConfig = (config?: ShopifyConfig | PublicShopifyConfig): ShopifyApiClientConfig => {
    if (!config?.clients?.storefront) {
        throw new Error('Could not create storefront client')
    }

    const {
        name,
        logger,

        clients: {
            storefront: {
                apiVersion,
                headers,

                publicAccessToken,
                mock,
            },
        },
    } = config

    const privateAccessToken = (config as ShopifyConfig)?.clients?.storefront?.privateAccessToken

    if (!name || ((!publicAccessToken && !privateAccessToken) && !mock)) {
        throw new Error('Could not create storefront client')
    }

    const apiUrl = mock
        ? createApiUrl(MOCK_STORE_DOMAIN, apiVersion)
        : createApiUrl(createStoreDomain(name), apiVersion)

    return {
        storeDomain: createStoreDomain(name),
        apiUrl,
        apiVersion,
        logger,
        headers: {
            ...(privateAccessToken ? { 'Shopify-Storefront-Private-Token': privateAccessToken } : {}),
            ...(!privateAccessToken && publicAccessToken ? { 'X-Shopify-Storefront-Access-Token': publicAccessToken } : {}),
            ...headers,
        },
    } satisfies ShopifyApiClientConfig
}
