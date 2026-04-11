import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
} from '../../../module'

import {
  createApiUrl,
  createStoreDomain,
} from '../client'

export const createAdminConfig = (config?: Partial<ShopifyConfig>): ShopifyApiClientConfig => {
  if (!config?.name || !config.clients?.admin) {
    throw new Error('[shopify] Failed to create admin client config: missing shop name or admin client config')
  }

  const {
    name,
    logger,

    clients: {
      admin: {
        apiVersion,
        accessToken,
        headers,
      },
    },
  } = config

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: createApiUrl(createStoreDomain(name), apiVersion, 'admin'),
    apiVersion,
    logger,
    headers: {
      ...(accessToken ? { 'X-Shopify-Access-Token': accessToken } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}
