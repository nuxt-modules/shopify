import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
} from '../../../module'

import {
  createApiUrl,
  createStoreDomain,
} from '../client'

export const createCustomerAccountConfig = (config?: ShopifyConfig | PublicShopifyConfig): ShopifyApiClientConfig => {
  if (!config?.clients?.customerAccount) {
    throw new Error('Could not create customer account client')
  }

  const {
    name,
    logger,

    clients: {
      customerAccount: {
        apiVersion,
        headers,

        clientId,
        clientSecret,
      },
    },
  } = config

  if (!name || !clientId) {
    throw new Error('Could not create customer account client')
  }

  const apiUrl = createApiUrl(createStoreDomain(name), apiVersion)

  return {
    storeDomain: createStoreDomain(name),
    apiUrl,
    apiVersion,
    logger,
    headers: {
      ...(clientId ? { 'Shopify-Storefront-Public-Token': clientId } : {}),
      ...(clientSecret ? { 'Shopify-Storefront-Private-Token': clientSecret } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}
