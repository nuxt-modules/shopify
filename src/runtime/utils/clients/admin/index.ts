import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'

import type {
  ModuleOptions,
  ShopifyAdminAuthCallbacks,
  ShopifyApiClientConfig,
  ShopifyClientConfig,
  ShopifyClientOptions,
} from '../../../../module'
import type { ClientDefinition } from '../create'

import {
  ADMIN_TOKEN_HEADER,
  createApiUrl,
  createStoreDomain,
} from '../transport'
import { createClient, isInlineConfig } from '../create'
import { DEFAULT_API_VERSION, DEFAULT_RETRIES } from '../defaults'
import { getAdminAccessToken } from './auth'

export function createAdminConfig(config?: ModuleOptions): ShopifyApiClientConfig {
  if (!config?.clients?.admin) {
    throw new Error('[shopify] Failed to create admin client config: client is not configured (set `clients.admin`)')
  }

  if (!config.name) {
    throw new Error('[shopify] Failed to create admin client config: missing shop name (set `name`)')
  }

  const {
    name,
    logger,

    clients: {
      admin: {
        accessToken,
        headers,
        retries,
      },
    },
  } = config

  const apiVersion = config.clients.admin.apiVersion || DEFAULT_API_VERSION

  return {
    storeDomain: createStoreDomain(name),
    apiUrl: createApiUrl(createStoreDomain(name), apiVersion, 'admin'),
    apiVersion,
    logger,
    retries: retries ?? DEFAULT_RETRIES,
    headers: {
      ...(accessToken ? { [ADMIN_TOKEN_HEADER]: accessToken } : {}),
      ...headers,
    },
  }
}

const definition: ClientDefinition<'admin'> = {
  kind: 'admin',
  createConfig: createAdminConfig,
  authHeader: ADMIN_TOKEN_HEADER,
}

export function createAdminApiClient(
  config: ShopifyClientConfig<'admin'>,
  options: ShopifyClientOptions<AdminOperations> & ShopifyAdminAuthCallbacks = {},
): AdminApiClient {
  const adminConfig = isInlineConfig(config) ? config : config.clients?.admin

  const auth = options.auth === undefined && adminConfig
    ? () => getAdminAccessToken(config.name, adminConfig, {
        storage: adminConfig.tokenStorage !== false,
        onAuthRequest: options.onAuthRequest,
        onAuthToken: options.onAuthToken,
        onAuthError: options.onAuthError,
        logger: options.logger ?? config.logger,
      })
    : options.auth

  return createClient<AdminOperations>(definition, config, { ...options, auth })
}
