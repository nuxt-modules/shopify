import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import type {
  ModuleOptions,
  ShopifyApiClientConfig,
  ShopifyClientConfig,
  ShopifyClientOptions,
} from '../../../../module'
import type { ClientDefinition } from '../create'

import { getRequestHeader } from 'h3'

import { pickShopifyCookies } from '../../cookies'
import {
  BUYER_IP_HEADER,
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
  STOREFRONT_ID_HEADER,
  createApiUrl,
  createStoreDomain,
} from '../transport'
import { resolveBuyerIp } from '../buyer-ip'
import { createClient } from '../create'
import { DEFAULT_API_VERSION, DEFAULT_RETRIES } from '../defaults'

export const MOCK_STORE_DOMAIN = 'https://mock.shop'

export function createStorefrontConfig(config?: ModuleOptions): ShopifyApiClientConfig {
  if (!config?.clients?.storefront) {
    throw new Error('[shopify] Failed to create storefront client config: client is not configured (set `clients.storefront`)')
  }

  const {
    name,
    logger,
    storefrontId,

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
      ...(storefrontId && !mock && !import.meta.client ? { [STOREFRONT_ID_HEADER]: String(storefrontId) } : {}),
      ...headers,
    },
  }
}

const definition: ClientDefinition<'storefront'> = {
  kind: 'storefront',
  createConfig: createStorefrontConfig,
  createProxyUrl: ({ clients }, origin, apiVersion) => clients?.storefront?.proxy ? createApiUrl(origin, apiVersion) : undefined,
  requestHeaders: ({ clients }, headers, { event, buyerIp }) => {
    const request = import.meta.server ? event : undefined
    const cookie = request && pickShopifyCookies(getRequestHeader(request, 'cookie'))
    const buyer = buyerIp ?? (request && resolveBuyerIp(request, clients?.storefront?.buyerIpHeader))

    return {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(buyer && headers[PRIVATE_TOKEN_HEADER] ? { [BUYER_IP_HEADER]: buyer } : {}),
    }
  },
  cachePresets: ({ clients }) => typeof clients?.storefront?.cache === 'object' ? clients.storefront.cache?.presets : undefined,
}

export function createStorefrontApiClient<Cache extends boolean | undefined = undefined>(
  config: ShopifyClientConfig<'storefront'>,
  options: ShopifyClientOptions<StorefrontOperations, Cache> = {},
): StorefrontApiClient<Cache> {
  return createClient<StorefrontOperations, Cache>(definition, config, options)
}
