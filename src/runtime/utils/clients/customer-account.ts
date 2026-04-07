import type { CustomerAccountOperations } from '../../../clients/customer-account'
import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
  ShopifyApiClient,
} from '../../../module'

import {
  createApiUrl,
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
        apiVersion,
        headers,

        clientId,
        clientSecret,
      },
    },
  } = config

  if (!name || !clientId) {
    throw new Error('[shopify] Failed to create customer account client config: missing configuration')
  }

  const apiUrl = createApiUrl(createStoreDomain(name), apiVersion)

  return {
    storeDomain: createStoreDomain(name),
    apiUrl,
    apiVersion,
    logger,
    headers: {
      // TODO: Use actual auth method instead of headers here
      ...(clientId ? { 'Shopify-Storefront-Public-Token': clientId } : {}),
      ...(clientSecret ? { 'Shopify-Storefront-Private-Token': clientSecret } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

export const withCustomerAccountCredentials = async <T extends CustomerAccountOperations>(client: ShopifyApiClient<T, undefined>, config?: ShopifyConfig | PublicShopifyConfig) => {
  const shopName = config?.name
  const customerAccountConfig = config?.clients?.customerAccount

  if (!shopName || !customerAccountConfig) {
    throw new Error('[shopify] Failed to create customer account client: missing shop name or customer account config')
  }

  const accessToken = customerAccountConfig.clientSecret

  if (!accessToken) {
    throw new Error('[shopify] Failed to create customer account client: missing client secret for access token')
  }

  // TODO: Use actual auth method instead of header here
  client.config.headers['Shopify-Storefront-Private-Token'] = accessToken

  return client
}
