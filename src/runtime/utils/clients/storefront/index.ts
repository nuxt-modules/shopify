import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import type {
  ModuleOptions,
  ShopifyApiClientConfig,
  ShopifyClientConfig,
  ShopifyClientOptions,
} from '../../../../module'
import type { ClientDefinition } from '../create'

import {
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
  createApiUrl,
  createStoreDomain,
} from '../transport'
import { createClient } from '../create'
import { DEFAULT_API_VERSION, DEFAULT_RETRIES } from '../defaults'

export const MOCK_STORE_DOMAIN = 'https://mock.shop'

export const createStorefrontConfig = (config?: ModuleOptions): ShopifyApiClientConfig => {
  if (!config?.clients?.storefront) {
    throw new Error('[shopify] Failed to create storefront client config: client is not configured (set `clients.storefront`)')
  }

  const {
    name,
    logger,

    clients: {
      storefront: {
        headers,
        retries,

        publicAccessToken,
        mock,
      },
    },
  } = config

  const apiVersion = config.clients.storefront.apiVersion || DEFAULT_API_VERSION
  const privateAccessToken = mock ? undefined : config.clients.storefront.privateAccessToken

  if (!name) {
    throw new Error('[shopify] Failed to create storefront client config: missing shop name (set `name`)')
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
    retries: retries ?? DEFAULT_RETRIES,
    headers: {
      ...(privateAccessToken ? { [PRIVATE_TOKEN_HEADER]: privateAccessToken } : {}),
      ...(!privateAccessToken && publicAccessToken ? { [PUBLIC_TOKEN_HEADER]: publicAccessToken } : {}),
      ...headers,
    },
  } satisfies ShopifyApiClientConfig
}

const definition: ClientDefinition<'storefront'> = {
  kind: 'storefront',
  createConfig: createStorefrontConfig,
  createProxyUrl: ({ clients }, origin, apiVersion) => clients?.storefront?.proxy ? createApiUrl(origin, apiVersion) : undefined,
  buyerIpHeader: ({ clients }) => clients?.storefront?.buyerIpHeader,
  cachePresets: ({ clients }) => typeof clients?.storefront?.cache === 'object' ? clients.storefront.cache?.presets : undefined,
  shopifyCookies: true,
}

export function createStorefrontApiClient<Cache extends boolean | undefined = undefined>(
  config: ShopifyClientConfig<'storefront'>,
  options: ShopifyClientOptions<StorefrontOperations, Cache> = {},
): StorefrontApiClient<Cache> {
  return createClient<StorefrontOperations, Cache>(definition, config, options)
}
