import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'

import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  ShopifyClientConfig,
  ShopifyClientDefinition,
  ShopifyClientOptions,
} from '../../../../module'

import {
  ADMIN_TOKEN_HEADER,
  createApiUrl,
  createStoreDomain,
} from '../transport'
import { createClient } from '../create'
import { getAdminAccessToken } from './auth'

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
        retries,
      },
    },
  } = config

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: createApiUrl(createStoreDomain(name), apiVersion, 'admin'),
    apiVersion,
    logger,
    retries,
    headers: {
      ...(accessToken ? { [ADMIN_TOKEN_HEADER]: accessToken } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

const definition: ShopifyClientDefinition<'admin'> = {
  kind: 'admin',
  createConfig: createAdminConfig,
  authHeader: ADMIN_TOKEN_HEADER,
}

export function createAdminClient(
  config: ShopifyClientConfig<'admin'>,
  options: ShopifyClientOptions<AdminOperations> = {},
): AdminApiClient {
  const adminConfig = ('clients' in config
    ? (config as ShopifyConfig).clients?.admin
    : config) as Parameters<typeof getAdminAccessToken>[1] | undefined

  const auth = options.auth === undefined && adminConfig
    ? () => getAdminAccessToken(config.name, adminConfig, {
        storage: adminConfig.tokenStorage !== false,
        onAuthRequest: options.onAuthRequest,
        onAuthToken: options.onAuthToken,
        onAuthError: options.onAuthError,
      })
    : options.auth

  return createClient<AdminOperations>(definition, config, { ...options, auth })
}
