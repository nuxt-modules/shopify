import type { HookResult, Nuxt } from '@nuxt/schema'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type {
  AllOperations,
  ClientResponse,
  ResponseErrors,
  ReturnData,
} from '@shopify/graphql-client'
import type { Storage, StorageValue } from 'unstorage'

import type {
  ShopifyClientType,
  ModuleOptions,
  ShopifyConfig,
  PublicModuleOptions,
  PublicShopifyConfig,
} from '../schemas'
import type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequestOptions,
} from './client'
import type { defineEventHandler, H3Event } from 'h3'

type ShopifyConfigHookParams = {
  nuxt: Nuxt
  config: ShopifyConfig
}

type ShopifyClientOptionHookParams = {
  config: ShopifyApiClientConfig
}

type ShopifyClientHookParams<Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  client: ShopifyApiClient<Operations, Cache>
}

type ShopifyClientRequestHookParams<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  operation: Operation
  options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>
}

type ShopifyClientResponseHookParams<Operation extends keyof Operations, Operations extends AllOperations, Cache extends boolean | undefined = undefined> = {
  response: ClientResponse<ReturnData<Operation, Operations>>
  operation: Operation
  options?: ShopifyApiClientRequestOptions<Operation, Operations, Cache>
}

type ShopifyErrorHookParams = {
  errors: ResponseErrors
}

type ShopifyTemplateHookParams = {
  nuxt: Nuxt
  config: Record<string, unknown>
}

declare module '@nuxt/schema' {
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
    }
  }

  interface RuntimeNuxtHooks {
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

/**
 * Augmentations for auto-imported functions from 'nuxt-auth-utils'
 */
declare module '#imports' {
  const defineOAuthShopifyCustomerEventHandler: (options: {
    onSuccess: (event: H3Event, params: { user: { firstName: string, lastName: string, emailAddress: { emailAddress: string } }, tokens: { access_token: string, refresh_token?: string } }) => Promise<void>
    onError: (event: H3Event, error: Error) => Promise<void>
  }) => ReturnType<typeof defineEventHandler>

  const setUserSession: (event: H3Event, sessionData: { user: { firstName: string, lastName: string, email: string }, secure: { accessToken: string, refreshToken?: string }, loggedInAt: Date }) => Promise<void>
  const getUserSession: (event: H3Event) => Promise<{ user: { firstName: string, lastName: string, email: string } | null, secure: { accessToken: string, refreshToken?: string } | null, loggedInAt: Date | null } | null>
  const clearUserSession: (event: H3Event) => Promise<void>
}

export type {
  ShopifyClientType,
  ModuleOptions,
  PublicModuleOptions,
  ShopifyConfig,
  PublicShopifyConfig,
}

export type {
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequestOptions,
} from './client'
