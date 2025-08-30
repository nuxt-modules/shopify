import type { GenericApiClientConfig, ShopifyConfig } from '../../../types'

import { createApiUrl, createStoreDomain } from './index'

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

                mock,
                publicAccessToken,
                privateAccessToken,
            },
        },
    } = config

    if (!name || (!publicAccessToken && !privateAccessToken) || (publicAccessToken && privateAccessToken)) {
        throw new Error('Could not create storefront client')
    }

    return {
        storeDomain: createStoreDomain(name),
        apiUrl: mock ? createApiUrl('https://mock.shop', apiVersion) : createApiUrl(createStoreDomain(name), apiVersion),
        apiVersion,
        logger,
        headers: {
            ...(publicAccessToken ? { 'X-Shopify-Storefront-Access-Token': publicAccessToken } : {}),
            ...(privateAccessToken ? { 'Shopify-Private-Access-Token': privateAccessToken } : {}),
            ...headers,
        },
    } satisfies GenericApiClientConfig
}
