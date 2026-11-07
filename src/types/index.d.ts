import type { HookResult } from '@nuxt/schema'
import type { CustomFetchApi } from '@shopify/graphql-client'
import type { ShopifyRequestContext, ShopifyScriptsI18n } from '@shopify/hydrogen'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type { Storage, StorageValue } from 'unstorage'
import type { H3Event } from 'h3'

import type {
  ShopifyClientType,
  ModuleOptions,
  ShopifyConfig,
  PublicModuleOptions,
  PublicShopifyConfig,
} from '../schemas'
import type {
  ShopifyAdminAuthErrorHookParams,
  ShopifyAdminAuthRequestHookParams,
  ShopifyAdminAuthTokenHookParams,
  ShopifyAnalyticsReadyHookParams,
  ShopifyClientHookParams,
  ShopifyClientOptionHookParams,
  ShopifyClientRequestHookParams,
  ShopifyClientResponseHookParams,
  ShopifyConfigHookParams,
  ShopifyCustomerAccountAuthHookParams,
  ShopifyErrorHookParams,
  ShopifyTemplateHookParams,
} from './hooks'
import type {
  ShopifyCustomerAccountContext,
} from './auth'
import type {
  ShopifyScriptsShopContext,
} from './analytics'

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    shopify?: DeepPartial<ModuleOptions>
    _shopify?: ShopifyConfig
  }

  interface PublicRuntimeConfig {
    shopify?: DeepPartial<PublicModuleOptions>
    _shopify?: PublicShopifyConfig
  }

  interface NuxtHooks {
    /**
     * Called before the config is persisted into the runtime config
     */
    'shopify:config': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult

    /**
     * Called after the module setup is completed
     */
    'shopify:setup': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult

    /**
     * Called before the storefront introspection schema is generated
     */
    'shopify:storefront:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the storefront types are generated
     */
    'shopify:storefront:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the storefront operations are generated
     */
    'shopify:storefront:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account introspection schema is generated
     */
    'shopify:customer-account:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account types are generated
     */
    'shopify:customer-account:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account operations are generated
     */
    'shopify:customer-account:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin introspection schema is generated
     */
    'shopify:admin:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin types are generated
     */
    'shopify:admin:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin operations are generated
     */
    'shopify:admin:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    shopify?: DeepPartial<ModuleOptions>
    _shopify?: ShopifyConfig
  }

  interface PublicRuntimeConfig {
    shopify?: DeepPartial<PublicModuleOptions>
    _shopify?: PublicShopifyConfig
  }
}

declare module '#app' {
  interface NuxtApp {
    $shopify?: {
      cache?: {
        storefront?: Storage<StorageValue>
      }
    }
  }

  interface RuntimeNuxtHooks {
    /**
     * Called once analytics is ready (shop identity resolved and Shopify's scripts started)
     */
    'shopify:analytics:ready': ({ shop, i18n }: ShopifyAnalyticsReadyHookParams) => HookResult

    /**
     * Called before the storefront client is created within nuxt
     */
    'shopify:storefront:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the storefront client is created within nuxt
     */
    'shopify:storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontOperations, true>) => HookResult

    /**
     * Called before the storefront client sends a request within nuxt
     */
    'shopify:storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof StorefrontOperations, StorefrontOperations, true>) => HookResult

    /**
     * Called after the storefront client receives a response within nuxt
     */
    'shopify:storefront:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof StorefrontOperations, StorefrontOperations, true>) => HookResult

    /**
     * Called whenever a storefront client response carries errors, whether or not `errors.throw` makes the request throw
     */
    'shopify:storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before the customer account client is created within nuxt
     */
    'shopify:customer-account:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the customer account client is created within nuxt
     */
    'shopify:customer-account:client:create': ({ client }: ShopifyClientHookParams<CustomerAccountOperations>) => HookResult

    /**
     * Called before the customer account client sends a request within nuxt
     */
    'shopify:customer-account:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called after the customer account client receives a response within nuxt
     */
    'shopify:customer-account:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called whenever a customer account client response carries errors, whether or not `errors.throw` makes the request throw
     */
    'shopify:customer-account:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
  }
}

declare module 'h3' {
  interface H3EventContext {
    shopifyMarket?: ShopifyScriptsI18n
    shopifyRequestContext?: ShopifyRequestContext
    shopifyRedirect?: (event: H3Event) => Promise<Response | null>
    shopifyScripts?: (event: H3Event) => Promise<ShopifyScriptsShopContext>
    shopifyCustomerAccount?: ShopifyCustomerAccountContext
    shopifyStorefrontCache?: CustomFetchApi
  }
}

declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    /**
     * Called before the storefront client is created within nitro
     */
    'shopify:storefront:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the storefront client is created within nitro
     */
    'shopify:storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontOperations>) => HookResult

    /**
     * Called before the storefront client sends a request within nitro
     */
    'shopify:storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

    /**
     * Called after the storefront client receives a response within nitro
     */
    'shopify:storefront:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

    /**
     * Called whenever a storefront client response carries errors, whether or not `errors.throw` makes the request throw
     */
    'shopify:storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before the customer account client is created within nitro
     */
    'shopify:customer-account:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the customer account client is created within nitro
     */
    'shopify:customer-account:client:create': ({ client }: ShopifyClientHookParams<CustomerAccountOperations>) => HookResult

    /**
     * Called before the customer account client sends a request within nitro
     */
    'shopify:customer-account:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called after the customer account client receives a response within nitro
     */
    'shopify:customer-account:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called whenever a customer account client response carries errors, whether or not `errors.throw` makes the request throw
     */
    'shopify:customer-account:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called after the customer signed in on Shopify's login page
     */
    'shopify:customer-account:auth:success': ({ event }: ShopifyCustomerAccountAuthHookParams) => HookResult

    /**
     * Called when the customer came back from Shopify's login page without being signed in
     */
    'shopify:customer-account:auth:error': ({ event }: ShopifyCustomerAccountAuthHookParams) => HookResult

    /**
     * Called after the customer account access token has been refreshed
     */
    'shopify:customer-account:auth:refresh': ({ event }: ShopifyCustomerAccountAuthHookParams) => HookResult

    /**
     * Called after the customer signed out
     */
    'shopify:customer-account:auth:logout': ({ event }: ShopifyCustomerAccountAuthHookParams) => HookResult

    /**
     * Called before the Admin API access token request is sent, with the request body as `params`, which may be mutated (e.g. to add a `scope`)
     */
    'shopify:admin:auth:request': ({ params }: ShopifyAdminAuthRequestHookParams) => HookResult

    /**
     * Called after a new Admin API access token is obtained via the client credentials grant
     */
    'shopify:admin:auth:success': ({ token }: ShopifyAdminAuthTokenHookParams) => HookResult

    /**
     * Called after the Admin API access token has been refreshed via the refresh token grant
     */
    'shopify:admin:auth:refresh': ({ token }: ShopifyAdminAuthTokenHookParams) => HookResult

    /**
     * Called when the Admin API access token request fails
     */
    'shopify:admin:auth:error': ({ error }: ShopifyAdminAuthErrorHookParams) => HookResult

    /**
     * Called before the admin client is created within nitro
     */
    'shopify:admin:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the admin client is created within nitro
     */
    'shopify:admin:client:create': ({ client }: ShopifyClientHookParams<AdminOperations>) => HookResult

    /**
     * Called before the admin client sends a request within nitro
     */
    'shopify:admin:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof AdminOperations, AdminOperations>) => HookResult

    /**
     * Called after the admin client receives a response within nitro
     */
    'shopify:admin:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof AdminOperations, AdminOperations>) => HookResult

    /**
     * Called whenever an admin client response carries errors, whether or not `errors.throw` makes the request throw
     */
    'shopify:admin:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
  }
}

export type {
  ShopifyClientType,
  ModuleOptions,
  PublicModuleOptions,
  ShopifyConfig,
  PublicShopifyConfig,
}

export type {
  ShopifyScriptsShopContext,
} from './analytics'

export type {
  ShopifyAdminTokenSet,
  ShopifyCustomerAccountContext,
  ShopifyCustomerAccountSession,
  ShopifyCustomerAccountSessionData,
} from './auth'

export type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientFetch,
  ShopifyApiClientRequest,
  ShopifyApiClientRequestOptions,
  ShopifyApiClientRequestParams,
  ShopifyApiClientRequestStream,
  ShopifyClientConfig,
  ShopifyClientKind,
  ShopifyClientOptions,
  ShopifyInlineConfig,
} from './client'

export type {
  ShopifyAdminAuthCallbacks,
  ShopifyAdminAuthErrorHookParams,
  ShopifyAdminAuthRequestHookParams,
  ShopifyAdminAuthTokenHookParams,
  ShopifyAnalyticsReadyHookParams,
  ShopifyClientCallbackResult,
  ShopifyClientCallbacks,
  ShopifyClientHookParams,
  ShopifyClientOptionHookParams,
  ShopifyClientRequestHookParams,
  ShopifyClientResponseHookParams,
  ShopifyConfigHookParams,
  ShopifyCustomerAccountAuthHookParams,
  ShopifyErrorHookParams,
  ShopifyTemplateHookParams,
} from './hooks'
