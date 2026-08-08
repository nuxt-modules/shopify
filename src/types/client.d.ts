/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApiClient,
  ApiClientConfig,
  AllOperations,
  ClientResponse,
  ClientStreamIterator,
  FetchResponseBody,
  ReturnData,
  ResponseWithType,
  ApiClientRequestOptions,
} from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'
import type { H3Event } from 'h3'
import type { Storage, StorageValue } from 'unstorage'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type {
  PublicShopifyConfig,
  ShopifyClientType,
  ShopifyConfig,
} from '../schemas'
import type {
  ShopifyAuthCallbacks,
  ShopifyClientCallbacks,
} from './hooks'

export type ShopifyClientSetupContext = {
  nuxt: Nuxt
  config: ShopifyConfig
  resolver: Resolver
}

type CacheHeaderType = 'short' | 'long' | 'none' | string

type ShopifyApiClientRequestCacheOptions = CacheHeaderType | {
  client?: CacheHeaderType | { ttl?: number }
  proxy?: CacheHeaderType
}

export type ShopifyApiClientRequestOptions<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = ApiClientRequestOptions<Operation, Operations>
  & (Cache extends true
    ? { cache?: ShopifyApiClientRequestCacheOptions }
    : { cache?: undefined }
    )

export type ShopifyApiClientRequestParams<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = [
    operation: Operation,
    options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>,
]

export type ShopifyApiClientConfig = ApiClientConfig & {
  logger?: Partial<ConsolaOptions>
}

export type ShopifyApiClientFetch<Operations extends AllOperations = AllOperations> = <Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations>) => Promise<ResponseWithType<FetchResponseBody<ReturnData<Operation, Operations>>>>
export type ShopifyApiClientRequest<Operations extends AllOperations = AllOperations, Cache extends boolean | undefined = undefined> = <TData = undefined, Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations, Cache>) => Promise<ClientResponse<TData extends undefined ? ReturnData<Operation, Operations> : TData>>
export type ShopifyApiClientRequestStream<Operations extends AllOperations = AllOperations> = <TData = undefined, Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations>) => Promise<ClientStreamIterator<TData extends undefined ? ReturnData<Operation, Operations> : TData>>

export type ShopifyApiClient<Operations extends AllOperations, Cache extends boolean | undefined = undefined> = Omit<ApiClient<ShopifyApiClientConfig, Operations>, 'fetch' | 'request'> & {
  fetch: ShopifyApiClientFetch<Operations>
  request: ShopifyApiClientRequest<Operations, Cache>
  requestStream: ShopifyApiClientRequestStream<Operations>
}

export type ShopifyClientKind = `${ShopifyClientType}`

type ShopifyClientConfigs = {
  storefront: NonNullable<ShopifyConfig['clients']['storefront']>
  customerAccount: NonNullable<ShopifyConfig['clients']['customerAccount']>
  admin: NonNullable<ShopifyConfig['clients']['admin']>
}

type ShopifyClientConfigOf<Kind extends ShopifyClientKind> = ShopifyClientConfigs[Kind]

export type ShopifyInlineConfig<Kind extends ShopifyClientKind = ShopifyClientKind>
  = & Partial<ShopifyClientConfigOf<Kind>>
    & Pick<ShopifyConfig, 'name'>
    & Partial<Pick<ShopifyConfig, 'logger' | 'errors'>>

export type ShopifyClientConfig<Kind extends ShopifyClientKind = ShopifyClientKind>
  = | ShopifyConfig
    | PublicShopifyConfig
    | ShopifyInlineConfig<Kind>

export type ShopifyClientDefinition<Kind extends ShopifyClientKind = ShopifyClientKind> = {
  kind: Kind

  createConfig: (config?: any) => ShopifyApiClientConfig

  authHeader?: string
  tracking?: boolean
  cache?: boolean
  cookies?: boolean
}

export type ShopifyClientOptions<
  Operations extends AllOperations = AllOperations,
  Cache extends boolean | undefined = undefined,
> = ShopifyClientCallbacks<Operations, Cache> & ShopifyAuthCallbacks & {
  /**
   * The request event.
   */
  event?: H3Event

  /**
   * The origin to route requests through when the client is configured to use a
   * proxy. Without it, requests go to the Shopify API directly.
   */
  origin?: string

  /**
   * The buyer's IP address, sent as `Shopify-Storefront-Buyer-IP` to improve
   * analytics attribution for server-to-server storefront requests.
   */
  buyerIp?: string | false

  /**
   * Storage to cache responses in.
   */
  cache?: Storage<StorageValue>

  /**
   * Resolves the access token to authenticate requests with.
   */
  auth?: (() => string | Promise<string>) | false

  /**
   * Overrides the API version to use for requests. Defaults to the module config's `apiVersion`, or the latest stable version if not set.
   */
  apiVersion?: string

  /**
   * Overrides the default headers to send with every request. Defaults to the module config's `headers`, or an empty object if not set.
   */
  headers?: Record<string, string>

  /**
   * Overrides the default number of retries to attempt for failed requests. Defaults to the module config's `retries`, or 0 if not set.
   */
  retries?: number

  /**
   * Overrides the default logger to use for logging. Defaults to the module config's `logger`, or an empty object if not set.
   */
  logger?: Partial<ConsolaOptions>

  /**
   * Whether responses carrying errors should throw. Defaults to the module config's `errors.throw`.
   */
  throwOnErrors?: boolean
}

export type ShopifyGenericClientOptions<
  Operations extends AllOperations = AllOperations,
  Cache extends boolean | undefined = undefined,
> = ShopifyClientOptions<Operations, Cache> & {
  /**
   * Which client to create.
   */
  client: ShopifyClientKind
}
