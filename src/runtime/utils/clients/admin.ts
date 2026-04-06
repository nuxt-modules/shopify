import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
} from '../../../module'

import {
  createApiUrl,
  createStoreDomain,
} from '../client'

export const createAdminConfig = (config?: Partial<ShopifyConfig>, accessToken?: string): ShopifyApiClientConfig => {
  if (!config?.name || !config.clients?.admin) {
    throw new Error('[shopify] Could not create admin client config: missing shop name or admin client config')
  }

  const resolvedToken = accessToken ?? config.clients.admin.accessToken
  if (!resolvedToken) {
    throw new Error('[shopify] Could not create admin client config: missing access token')
  }

  const {
    name,
    logger,

    clients: {
      admin: {
        apiVersion,
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
      'X-Shopify-Access-Token': resolvedToken,
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}
