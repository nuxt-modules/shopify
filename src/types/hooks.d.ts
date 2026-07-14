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
