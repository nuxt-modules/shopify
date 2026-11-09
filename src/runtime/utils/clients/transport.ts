import type {
  AllOperations,
  CustomFetchApi,
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

export const SERVER_CACHE_HEADER = 'X-Shopify-Server-Cache'
export const PRIVATE_TOKEN_HEADER = 'Shopify-Storefront-Private-Token'
export const PUBLIC_TOKEN_HEADER = 'X-Shopify-Storefront-Access-Token'
export const ADMIN_TOKEN_HEADER = 'X-Shopify-Access-Token'
export const BUYER_IP_HEADER = 'Shopify-Storefront-Buyer-IP'
const SDK_VARIANT_HEADER = 'X-SDK-Variant'
const SDK_VERSION_HEADER = 'X-SDK-Version'

export const CUSTOMER_ACCOUNT_PROXY_ROUTE = '/account/customer/api/:version/graphql'

const API_VERSION_SEGMENT = /\/api\/[^/]+(?=\/|$)/

export function createStoreDomain(name: string) {
  return `https://${name}.myshopify.com`
}

export function createApiUrl(storeDomain: string, apiVersion: string, apiPrefix?: string) {
  return joinURL(
    storeDomain,
    apiPrefix ? `${apiPrefix}/api` : 'api',
    apiVersion,
    'graphql.json',
  )
}

export function withApiVersion(apiUrl: string, apiVersion: string) {
  return apiUrl.replace(API_VERSION_SEGMENT, `/api/${apiVersion}`)
}

export function createTransport<Operations extends AllOperations = AllOperations, Cache extends boolean | undefined = undefined>(
  config: ShopifyApiClientConfig,
  transportOptions: { normalize?: boolean, fetch?: CustomFetchApi } = {},
): ShopifyApiClient<Operations, Cache> {
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

  const trace = logger ? createConsola(logger).withTag('shopify').trace : undefined

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
    logger: trace
      ? ({ type, content }) => trace({ type, content: 'requestParams' in content ? { ...content, requestParams: [content.requestParams[0]] } : content })
      : undefined,
    ...(transportOptions.fetch ? { customFetchApi: transportOptions.fetch } : {}),
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

      const requestHeaders = headers
        ? getHeaders(headers)
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
