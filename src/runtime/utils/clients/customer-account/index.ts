import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'

import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
  ShopifyClientConfig,
  ShopifyClientDefinition,
  ShopifyClientOptions,
} from '../../../../module'

import {
  createStoreDomain,
} from '../transport'
import { createClient } from '../create'

export const createCustomerAccountConfig = (config?: ShopifyConfig | PublicShopifyConfig): ShopifyApiClientConfig => {
  if (!config?.clients?.customerAccount) {
    throw new Error('[shopify] Failed to create customer account client config: client is not configured (set `shopify.clients.customerAccount`)')
  }

  const {
    name,
    logger,

    clients: {
      customerAccount: {
        apiURL,
        apiVersion,
        headers,
        retries,

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

  if (!apiURL) {
    throw new Error('[shopify] Failed to create customer account client config: the customer account API URL could not be resolved')
  }

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: apiURL,
    apiVersion,
    logger,
    retries,
    headers: {
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

const definition: ShopifyClientDefinition<'customerAccount'> = {
  kind: 'customerAccount',
  createConfig: createCustomerAccountConfig,
  authHeader: 'Authorization',
  cookies: true,
}

export function createCustomerAccountClient(
  config: ShopifyClientConfig<'customerAccount'>,
  options: ShopifyClientOptions<CustomerAccountOperations> = {},
): CustomerAccountApiClient {
  return createClient<CustomerAccountOperations>(definition, config, options)
}
