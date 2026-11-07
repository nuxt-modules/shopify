import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'

import type {
  ModuleOptions,
  ShopifyApiClientConfig,
  ShopifyClientConfig,
  ShopifyClientOptions,
} from '../../../../module'
import type { ClientDefinition } from '../create'

import { joinURL } from 'ufo'

import {
  CUSTOMER_ACCOUNT_PROXY_ROUTE,
  createStoreDomain,
} from '../transport'
import { createClient } from '../create'
import { DEFAULT_API_VERSION, DEFAULT_RETRIES } from '../defaults'

export const createCustomerAccountConfig = (config?: ModuleOptions): ShopifyApiClientConfig => {
  if (!config?.clients?.customerAccount) {
    throw new Error('[shopify] Failed to create customer account client config: client is not configured (set `clients.customerAccount`)')
  }

  const {
    name,
    shopId,
    logger,

    clients: {
      customerAccount: {
        headers,
        retries,
      },
    },
  } = config

  const apiVersion = config.clients.customerAccount.apiVersion || DEFAULT_API_VERSION

  if (!name) {
    throw new Error('[shopify] Failed to create customer account client config: missing shop name (set `name`)')
  }

  if (!shopId) {
    throw new Error('[shopify] Failed to create customer account client config: missing the shop ID (set `shopId`)')
  }

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: `https://shopify.com/${shopId}/account/customer/api/${apiVersion}/graphql`,
    apiVersion,
    logger,
    retries: retries ?? DEFAULT_RETRIES,
    headers: {
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

const definition: ClientDefinition<'customerAccount'> = {
  kind: 'customerAccount',
  createConfig: createCustomerAccountConfig,
  createProxyUrl: ({ clients }, origin, apiVersion) => clients?.customerAccount?.proxy ? joinURL(origin, CUSTOMER_ACCOUNT_PROXY_ROUTE.replace(':version', apiVersion)) : undefined,
  authHeader: 'Authorization',
}

export function createCustomerAccountApiClient(
  config: ShopifyClientConfig<'customerAccount'>,
  options: ShopifyClientOptions<CustomerAccountOperations> = {},
): CustomerAccountApiClient {
  return createClient<CustomerAccountOperations>(definition, config, options)
}
