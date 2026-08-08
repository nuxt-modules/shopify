import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import type {
  ShopifyApiClientConfig,
  ShopifyConfig,
  PublicShopifyConfig,
  ShopifyClientConfig,
  ShopifyClientDefinition,
  ShopifyClientOptions,
} from '../../../../module'

import {
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
  createApiUrl,
  createStoreDomain,
} from '../transport'
import { createClient } from '../create'

const MOCK_STORE_DOMAIN = 'https://mock.shop'

export const createStorefrontConfig = (config?: ShopifyConfig | PublicShopifyConfig): ShopifyApiClientConfig => {
  if (!config?.clients?.storefront) {
    throw new Error('[shopify] Failed to create storefront client config: client is not configured (set `shopify.clients.storefront`)')
  }

  const {
    name,
    logger,

    clients: {
      storefront: {
        apiVersion,
        headers,
        retries,

        publicAccessToken,
        mock,
      },
    },
  } = config

  const privateAccessToken = (config as ShopifyConfig)?.clients?.storefront?.privateAccessToken

  if (!name) {
    throw new Error('[shopify] Failed to create storefront client config: missing shop name (set `shopify.name`)')
  }

  if (!publicAccessToken && !privateAccessToken && !mock) {
    throw new Error('[shopify] Failed to create storefront client config: missing access token (set `publicAccessToken` or `privateAccessToken`)')
  }

  const apiUrl = mock
    ? createApiUrl(MOCK_STORE_DOMAIN, apiVersion)
    : createApiUrl(createStoreDomain(name), apiVersion)

  return {
    storeDomain: createStoreDomain(name),
    apiUrl,
    apiVersion,
    logger,
    retries,
    headers: {
      ...(privateAccessToken ? { [PRIVATE_TOKEN_HEADER]: privateAccessToken } : {}),
      ...(!privateAccessToken && publicAccessToken ? { [PUBLIC_TOKEN_HEADER]: publicAccessToken } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

const definition: ShopifyClientDefinition<'storefront'> = {
  kind: 'storefront',
  createConfig: createStorefrontConfig,
  tracking: true,
  cache: true,
}

export function createStorefrontClient<Cache extends boolean | undefined = undefined>(
  config: ShopifyClientConfig<'storefront'>,
  options: ShopifyClientOptions<StorefrontOperations, Cache> = {},
): StorefrontApiClient<Cache> {
  return createClient<StorefrontOperations, Cache>(definition, config, options)
}
