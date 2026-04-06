import type { AdminOperations } from '../../../clients/admin'
import type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyConfig,
} from '../../../module'

import { createError } from 'h3'

import {
  createApiUrl,
  createStoreDomain,
} from '../client'
import { getAdminAccessToken } from '../../server/utils/admin/auth'

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
      ...(config.clients.admin.accessToken ? { 'X-Shopify-Access-Token': config.clients.admin.accessToken } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

export const withAdminAccessToken = async <T extends AdminOperations>(client: ShopifyApiClient<T, undefined>, config?: Partial<ShopifyConfig>) => {
  const shopName = config?.name
  const adminClientConfig = config?.clients?.admin

  if (!shopName || !adminClientConfig) {
    throw createError({
      statusCode: 500,
      message: '[shopify] Failed to create admin client: missing shop name or admin config',
    })
  }

  const accessToken = await getAdminAccessToken(shopName, adminClientConfig, adminClientConfig.tokenStorage !== false)

  client.config.headers['X-Shopify-Access-Token'] = accessToken

  return client
}
