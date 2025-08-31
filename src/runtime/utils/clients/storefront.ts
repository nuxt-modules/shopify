import type { GenericApiClientConfig, ShopifyConfig } from '../../../types'

import { createApiUrl, createStoreDomain } from './index'

const MOCK_STORE_DOMAIN = 'https://mock.shop'

export const createStorefrontConfig = (config?: Partial<ShopifyConfig>): GenericApiClientConfig => {
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
                privateAccessToken,
                mock,
            },
        },
    } = config

    if (!name || (!publicAccessToken && !privateAccessToken) || (publicAccessToken && privateAccessToken)) {
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
            ...(publicAccessToken ? { 'X-Shopify-Storefront-Access-Token': publicAccessToken } : {}),
            ...(privateAccessToken ? { 'Shopify-Private-Access-Token': privateAccessToken } : {}),
            ...headers,
        },
    } satisfies GenericApiClientConfig
}
