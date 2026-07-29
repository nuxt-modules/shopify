import type { Nuxt } from '@nuxt/schema'
import type {
  AllOperations,
  ClientResponse,
  ResponseErrors,
  ReturnData,
} from '@shopify/graphql-client'

import type { ShopifyConfig } from '../schemas'
import type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequestOptions,
} from './client'
import type {
  AnalyticsEventName,
  ShopAnalytics,
} from './analytics'
import type {
  AdminTokenSet,
  CustomerAccountTokenSet,
  CustomerAccountUser,
} from './auth'

export type ShopifyConfigHookParams = {
  nuxt: Nuxt
  config: ShopifyConfig
}

export type ShopifyClientOptionHookParams = {
  config: ShopifyApiClientConfig
}

export type ShopifyClientHookParams<Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  client: ShopifyApiClient<Operations, Cache>
}

export type ShopifyClientRequestHookParams<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  operation: Operation
  options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>
  config?: ShopifyApiClientConfig
}

export type ShopifyClientResponseHookParams<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  response: ClientResponse<ReturnData<Operation, Operations>>
  operation: Operation
  options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>
}

export type ShopifyAnalyticsReadyHookParams = {
  shop: ShopAnalytics | null
}

export type ShopifyAnalyticsPublishHookParams = {
  event: AnalyticsEventName
  payload: unknown
}

export type ShopifyErrorHookParams = {
  errors: ResponseErrors
}

export type ShopifyTemplateHookParams = {
  nuxt: Nuxt
  config: Record<string, unknown>
}

export type ShopifyCustomerAccountAuthorizeHookParams = {
  params: Record<string, string>
}

export type ShopifyCustomerAccountAuthSuccessHookParams = {
  user: CustomerAccountUser
  tokens: CustomerAccountTokenSet
}

export type ShopifyCustomerAccountAuthRefreshHookParams = {
  tokens: CustomerAccountTokenSet
}

export type ShopifyCustomerAccountAuthLogoutHookParams = {
  user: CustomerAccountUser | null
  idToken?: string
}

export type ShopifyCustomerAccountAuthErrorHookParams = {
  error: unknown
}

export type ShopifyAdminAuthRequestHookParams = {
  params: Record<string, string>
}

export type ShopifyAdminAuthTokenHookParams = {
  token: AdminTokenSet
}

export type ShopifyAdminAuthErrorHookParams = {
  error: unknown
}

export type ShopifyClientCallbackResult = void | Promise<void>

/**
 * Lifecycle callbacks of a Shopify API client.
 *
 * The client itself is environment agnostic and never resolves a hook target on
 * its own - wire these to `nuxtApp.hooks` / `nitroApp.hooks` / `nuxt.hooks`, or
 * to anything else, at the call site.
 */
export type ShopifyClientCallbacks<Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  /**
   * Called with the resolved client config, before the client is created.
   * The config may be mutated.
   */
  onConfigure?: (params: ShopifyClientOptionHookParams) => ShopifyClientCallbackResult

  /**
   * Called with the fully assembled client.
   */
  onCreate?: (params: ShopifyClientHookParams<Operations, Cache>) => ShopifyClientCallbackResult

  /**
   * Called before every request is sent.
   */
  onRequest?: (params: ShopifyClientRequestHookParams<keyof Operations, Operations, Cache>) => ShopifyClientCallbackResult

  /**
   * Called after every response is received.
   */
  onResponse?: (params: ShopifyClientResponseHookParams<keyof Operations, Operations, Cache>) => ShopifyClientCallbackResult

  /**
   * Called whenever a response carries errors, before they are thrown.
   */
  onErrors?: (params: ShopifyErrorHookParams) => ShopifyClientCallbackResult
}

/**
 * Lifecycle callbacks of an access token exchange.
 */
export type ShopifyAuthCallbacks = {
  /**
   * Called with the token request body, before it is sent. May be mutated.
   */
  onAuthRequest?: (params: ShopifyAdminAuthRequestHookParams) => ShopifyClientCallbackResult

  /**
   * Called with a newly obtained token. `refresh` is `true` when it was
   * obtained through the refresh token grant.
   */
  onAuthToken?: (params: ShopifyAdminAuthTokenHookParams & { refresh: boolean }) => ShopifyClientCallbackResult

  /**
   * Called when the token exchange fails, before the error is rethrown.
   */
  onAuthError?: (params: ShopifyAdminAuthErrorHookParams) => ShopifyClientCallbackResult
}
