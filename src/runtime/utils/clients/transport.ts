import type {
  AllOperations,
  RequestParams,
} from '@shopify/graphql-client'

import type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequestOptions,
} from '../../../module'

import { createGraphQLClient } from '@shopify/graphql-client'
import { joinURL } from 'ufo'
import { createConsola } from 'consola'

import { MODULE_VERSION } from '../version'
import { normalizeOperation } from '../graphql/normalize'

export const PROXY_API_VERSION_HEADER = 'X-Shopify-Proxy-Api-Version'
export const PROXY_CACHE_HEADER = 'X-Shopify-Proxy-Cache'
export const PRIVATE_TOKEN_HEADER = 'Shopify-Storefront-Private-Token'
export const PUBLIC_TOKEN_HEADER = 'X-Shopify-Storefront-Access-Token'
export const ADMIN_TOKEN_HEADER = 'X-Shopify-Access-Token'
export const BUYER_IP_HEADER = 'Shopify-Storefront-Buyer-IP'
export const SDK_VARIANT_HEADER = 'X-SDK-Variant'
export const SDK_VERSION_HEADER = 'X-SDK-Version'

const API_VERSION_SEGMENT = /\/api\/[^/]+(?=\/|$)/

export const createStoreDomain = (name: string) => `https://${name}.myshopify.com`

export const createApiUrl = (storeDomain: string, apiVersion: string, apiPrefix?: string) => joinURL(
  storeDomain,
  apiPrefix ? `${apiPrefix}/api` : 'api',
  apiVersion,
  'graphql.json',
)

export const isVersionedApiUrl = (apiUrl: string) => API_VERSION_SEGMENT.test(apiUrl)

export const withApiVersion = (apiUrl: string, apiVersion: string) =>
  apiUrl.replace(API_VERSION_SEGMENT, `/api/${apiVersion}`)

export const createTransport = <Operations extends AllOperations = AllOperations, Cache extends boolean | undefined = undefined>(
  config: ShopifyApiClientConfig,
  transportOptions: { normalize?: boolean } = {},
): ShopifyApiClient<Operations, Cache> => {
  const {
    storeDomain,
    apiUrl,
    apiVersion,
    headers,
    logger,
    retries,
  } = config

  if (!apiVersion) {
    throw new Error('[shopify] Failed to create client: API version is required')
  }

  const clientConfig = {
    storeDomain,
    apiUrl,
    apiVersion: apiVersion,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      [SDK_VARIANT_HEADER]: 'nuxt-shopify',
      [SDK_VERSION_HEADER]: MODULE_VERSION,
      ...headers,
    },
  } satisfies ShopifyApiClientConfig

  const graphqlClient = createGraphQLClient({
    url: apiUrl,
    headers: clientConfig.headers,
    retries,
    logger: logger ? createConsola(logger).withTag('shopify').trace : undefined,
  })

  const getHeaders: ShopifyApiClient<Operations>['getHeaders'] = customHeaders =>
    ({ ...clientConfig.headers, ...(customHeaders ?? {}) })

  const getApiUrl: ShopifyApiClient<Operations>['getApiUrl'] = (propApiVersion?: string) =>
    propApiVersion ? withApiVersion(apiUrl, propApiVersion) : apiUrl

  const getGQLClientParams = <
    Operation extends keyof Operations,
    Cache extends boolean | undefined = undefined,
  >(
    operation: Operation,
    options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>,
  ): RequestParams => {
    const props: RequestParams = [
      transportOptions.normalize === false
        ? operation as string
        : normalizeOperation(operation as string),
    ]

    if (options && Object.keys(options).length > 0) {
      const {
        variables,
        apiVersion,
        headers,
        retries,
        signal,
        cache,
      } = options

      const proxied = apiVersion && !isVersionedApiUrl(apiUrl)

      const requestHeaders = proxied
        ? getHeaders({ ...headers, [PROXY_API_VERSION_HEADER]: apiVersion } as unknown as Record<string, string[]>)
        : headers
          ? getHeaders(headers as unknown as Record<string, string[]>)
          : undefined

      props.push({
        ...(variables ? { variables } : {}),
        ...(apiVersion ? { url: getApiUrl(apiVersion) } : {}),
        ...(requestHeaders ? { headers: requestHeaders } : {}),
        ...(retries !== undefined ? { retries } : {}),
        ...(signal ? { signal } : {}),
        ...(cache ? { cache } : {}),
      })
    }

    return props
  }

  return {
    config: clientConfig,
    getHeaders,
    getApiUrl,
    fetch: (...props) => graphqlClient.fetch(...getGQLClientParams(...props)),
    request: (...props) => graphqlClient.request(...getGQLClientParams(...props)),
    requestStream: (...props) => graphqlClient.requestStream(...getGQLClientParams(...props)),
  } as ShopifyApiClient<Operations, Cache>
}
