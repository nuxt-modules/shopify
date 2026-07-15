import type { HookResult } from '@nuxt/schema'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type { Storage, StorageValue } from 'unstorage'

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
  ShopifyAnalyticsPublishHookParams,
  ShopifyAnalyticsReadyHookParams,
  ShopifyClientHookParams,
  ShopifyClientOptionHookParams,
  ShopifyClientRequestHookParams,
  ShopifyClientResponseHookParams,
  ShopifyConfigHookParams,
  ShopifyCustomerAccountAuthErrorHookParams,
  ShopifyCustomerAccountAuthLogoutHookParams,
  ShopifyCustomerAccountAuthorizeHookParams,
  ShopifyCustomerAccountAuthRefreshHookParams,
  ShopifyCustomerAccountAuthSuccessHookParams,
  ShopifyErrorHookParams,
  ShopifyTemplateHookParams,
} from './hooks'
import type {
  ShopifyAnalyticsContext,
} from './analytics'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    shopify?: ModuleOptions
  }

  interface NuxtOptions {
    shopify?: ModuleOptions
  }

  interface RuntimeConfig {
    shopify?: ModuleOptions
    _shopify?: ShopifyConfig
  }

  interface PublicRuntimeConfig {
    shopify?: PublicModuleOptions
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
    'storefront:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the storefront types are generated
     */
    'storefront:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the storefront operations are generated
     */
    'storefront:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account introspection schema is generated
     */
    'customer-account:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account types are generated
     */
    'customer-account:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the customer account operations are generated
     */
    'customer-account:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin introspection schema is generated
     */
    'admin:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin types are generated
     */
    'admin:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

    /**
     * Called before the admin operations are generated
     */
    'admin:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult
  }
}

declare module '#app' {
  interface NuxtApp {
    $shopify?: {
      cache?: {
        storefront?: Storage<StorageValue>
      }

      analytics?: ShopifyAnalyticsContext
    }
  }

  interface RuntimeNuxtHooks {
    /**
     * Called once analytics is ready (shop identity resolved and the Customer Privacy API loaded)
     */
    'analytics:ready': ({ shop }: ShopifyAnalyticsReadyHookParams) => HookResult

    /**
     * Called whenever an analytics event is published, before it is dispatched to subscribers
     */
    'analytics:publish': ({ event, payload }: ShopifyAnalyticsPublishHookParams) => HookResult

    /**
     * Called before the storefront client is created within nuxt
     */
    'storefront:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the storefront client is created within nuxt
     */
    'storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontOperations, true>) => HookResult

    /**
     * Called before the storefront client sends a request within nuxt
     */
    'storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof StorefrontOperations, StorefrontOperations, true>) => HookResult

    /**
     * Called after the storefront client receives a response within nuxt
     */
    'storefront:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof StorefrontOperations, StorefrontOperations, true>) => HookResult

    /**
     * Called when the storefront client throws an error within nuxt
     */
    'storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before the customer account client is created within nuxt
     */
    'customer-account:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the customer account client is created within nuxt
     */
    'customer-account:client:create': ({ client }: ShopifyClientHookParams<CustomerAccountOperations>) => HookResult

    /**
     * Called before the customer account client sends a request within nuxt
     */
    'customer-account:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called after the customer account client receives a response within nuxt
     */
    'customer-account:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called when the customer account client throws an error within nuxt
     */
    'customer-account:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before redirecting the user to Shopify to start the browser-mode OAuth flow.
     * The `params` object is the authorization request query and may be mutated (e.g. to add a `locale`).
     */
    'customer-account:auth:authorize': ({ params }: ShopifyCustomerAccountAuthorizeHookParams) => HookResult

    /**
     * Called after a successful customer account login in browser mode, after the session is stored.
     */
    'customer-account:auth:success': ({ user, tokens }: ShopifyCustomerAccountAuthSuccessHookParams) => HookResult

    /**
     * Called after the customer account access token has been refreshed in browser mode.
     */
    'customer-account:auth:refresh': ({ tokens }: ShopifyCustomerAccountAuthRefreshHookParams) => HookResult

    /**
     * Called before the customer account session is cleared on logout in browser mode.
     */
    'customer-account:auth:logout': ({ user, idToken }: ShopifyCustomerAccountAuthLogoutHookParams) => HookResult

    /**
     * Called when the customer account OAuth flow fails in browser mode.
     */
    'customer-account:auth:error': ({ error }: ShopifyCustomerAccountAuthErrorHookParams) => HookResult
  }
}

declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    /**
     * Called before the storefront client is created within nitro
     */
    'storefront:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the storefront client is created within nitro
     */
    'storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontOperations>) => HookResult

    /**
     * Called before the storefront client sends a request within nitro
     */
    'storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

    /**
     * Called after the storefront client receives a response within nitro
     */
    'storefront:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

    /**
     * Called when the storefront client throws an error within nitro
     */
    'storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before the customer account client is created within nitro
     */
    'customer-account:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the customer account client is created within nitro
     */
    'customer-account:client:create': ({ client }: ShopifyClientHookParams<CustomerAccountOperations>) => HookResult

    /**
     * Called before the customer account client sends a request within nitro
     */
    'customer-account:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called after the customer account client receives a response within nitro
     */
    'customer-account:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof CustomerAccountOperations, CustomerAccountOperations>) => HookResult

    /**
     * Called when the customer account client throws an error within nitro
     */
    'customer-account:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

    /**
     * Called before redirecting the user to Shopify to start the customer account OAuth flow.
     * The `params` object is the authorization request query and may be mutated (e.g. to add a `locale`).
     */
    'customer-account:auth:authorize': ({ params }: ShopifyCustomerAccountAuthorizeHookParams) => HookResult

    /**
     * Called after a successful customer account login, before the session is persisted.
     */
    'customer-account:auth:success': ({ user, tokens }: ShopifyCustomerAccountAuthSuccessHookParams) => HookResult

    /**
     * Called after the customer account access token has been refreshed.
     */
    'customer-account:auth:refresh': ({ tokens }: ShopifyCustomerAccountAuthRefreshHookParams) => HookResult

    /**
     * Called before the customer account session is cleared on logout.
     */
    'customer-account:auth:logout': ({ user, idToken }: ShopifyCustomerAccountAuthLogoutHookParams) => HookResult

    /**
     * Called when the customer account OAuth flow fails.
     */
    'customer-account:auth:error': ({ error }: ShopifyCustomerAccountAuthErrorHookParams) => HookResult

    /**
     * Called before the admin API access token request is sent.
     * The `params` object is the token request body and may be mutated (e.g. to add a `scope`).
     */
    'admin:auth:request': ({ params }: ShopifyAdminAuthRequestHookParams) => HookResult

    /**
     * Called after a new admin API access token is obtained via the client credentials grant.
     */
    'admin:auth:success': ({ token }: ShopifyAdminAuthTokenHookParams) => HookResult

    /**
     * Called after the admin API access token has been refreshed via the refresh token grant.
     */
    'admin:auth:refresh': ({ token }: ShopifyAdminAuthTokenHookParams) => HookResult

    /**
     * Called when the admin API access token request fails.
     */
    'admin:auth:error': ({ error }: ShopifyAdminAuthErrorHookParams) => HookResult

    /**
     * Called before the admin client is created within nitro
     */
    'admin:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

    /**
     * Called after the admin client is created within nitro
     */
    'admin:client:create': ({ client }: ShopifyClientHookParams<AdminOperations>) => HookResult

    /**
     * Called before the admin client sends a request within nitro
     */
    'admin:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof AdminOperations, AdminOperations>) => HookResult

    /**
     * Called after the admin client receives a response within nitro
     */
    'admin:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof AdminOperations, AdminOperations>) => HookResult

    /**
     * Called when the admin client throws an error within nitro
     */
    'admin:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
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
  AdminTokenSet,
  CustomerAccountSession,
  CustomerAccountSessionData,
  CustomerAccountTokenSet,
  CustomerAccountTokens,
  CustomerAccountUser,
  OpenIdConfiguration,
} from './auth'

export type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequest,
  ShopifyApiClientRequestOptions,
} from './client'

export type {
  AnalyticsEmitter,
  AnalyticsEventName,
  AnalyticsEventPayload,
  AnalyticsProductInput,
  AnalyticsSubscriber,
  CartViewPayload,
  CartUpdatePayload,
  CollectionViewPayload,
  CustomerPrivacyApi,
  PrivacyBanner,
  ProductViewPayload,
  SearchViewPayload,
  ShopAnalytics,
  ShopifyAnalyticsCart,
  ShopifyAnalyticsCartLine,
  ShopifyAnalyticsContext,
  TrackingConsent,
} from './analytics'
