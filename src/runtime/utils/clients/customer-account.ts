import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
} from '../../../module'

import {
  createStoreDomain,
} from '../client'

export const createCustomerAccountConfig = (config?: ShopifyConfig | PublicShopifyConfig, headers?: Record<string, string>): ShopifyApiClientConfig => {
  if (!config?.clients?.customerAccount) {
    throw new Error('[shopify] Failed to create customer account client config: missing configuration')
  }

  const {
    name,
    logger,

    clients: {
      customerAccount: {
        apiUrl,
        apiVersion,
        headers: customHeaders,

        clientId,
      },
    },
  } = config

  if (!name || !clientId) {
    throw new Error('[shopify] Failed to create customer account client config: missing configuration')
  }

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: apiUrl ?? '',
    apiVersion,
    logger,
    headers: {
      ...headers,
      ...customHeaders,
    },
  } satisfies ShopifyApiClientConfig
}
