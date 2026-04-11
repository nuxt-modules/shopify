import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
} from '../../../module'

import {
  createStoreDomain,
} from '../client'

export const createCustomerAccountConfig = (config?: ShopifyConfig | PublicShopifyConfig): ShopifyApiClientConfig => {
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
        headers,

        clientId,
      },
    },
  } = config

  if (!name || !apiUrl || !clientId) {
    throw new Error('[shopify] Failed to create customer account client config: missing configuration')
  }

  return {
    storeDomain: createStoreDomain(name),
    apiUrl,
    apiVersion,
    logger,
    headers: {
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}
