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
    throw new Error('[shopify] Failed to create customer account client config: client is not configured (set `shopify.clients.customerAccount`)')
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

  if (!name) {
    throw new Error('[shopify] Failed to create customer account client config: missing shop name (set `shopify.name`)')
  }

  if (!clientId) {
    throw new Error('[shopify] Failed to create customer account client config: missing `clientId`')
  }

  if (!apiUrl) {
    throw new Error('[shopify] Failed to create customer account client config: the customer account API URL could not be resolved (check the build logs)')
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
