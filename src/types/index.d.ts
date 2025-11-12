import type { HookResult, Nuxt } from '@nuxt/schema'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type {
    AllOperations,
    ClientResponse,
    ResponseErrors,
    ReturnData,
} from '@shopify/graphql-client'

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

type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

type ShopifyClientOptionHookParams = {
    config: ShopifyApiClientConfig
}

type ShopifyClientHookParams<Operations extends AllOperations> = {
    client: ShopifyApiClient<Operations>
}

type ShopifyClientRequestHookParams<Operation extends keyof Operations, Operations extends AllOperations> = {
    operation: Operation
    options?: ShopifyApiClientRequestOptions<Operation, Operations>
}

type ShopifyClientResponseHookParams<Operation extends keyof Operations, Operations extends AllOperations> = {
    response: ClientResponse<ReturnData<Operation, Operations>>
    operation: Operation
    options?: ShopifyApiClientRequestOptions<Operation, Operations>
}

type ShopifyErrorHookParams = {
    errors: ResponseErrors
}

type ShopifyTemplateHookParams = {
    nuxt: Nuxt
    config: Record<string, unknown>
}

type ShopifySandboxConfig = {
    url: string
    headers: Record<string, string>
}

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        shopify?: ModuleOptions
        _shopify?: ShopifyConfig

        _sandbox?: Record<string, ShopifySandboxConfig>
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
    interface RuntimeNuxtHooks {
        /**
         * Called before the storefront client is created within nuxt
         */
        'storefront:client:configure': ({ config }: ShopifyClientOptionHookParams) => HookResult

        /**
         * Called after the storefront client is created within nuxt
         */
        'storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontOperations>) => HookResult

        /**
         * Called before the storefront client sends a request within nuxt
         */
        'storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

        /**
         * Called after the storefront client receives a response within nuxt
         */
        'storefront:client:response': ({ response, operation, options }: ShopifyClientResponseHookParams<keyof StorefrontOperations, StorefrontOperations>) => HookResult

        /**
         * Called when the storefront client throws an error within nuxt
         */
        'storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
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
    ShopifyApiClient,
    ShopifyApiClientConfig,
    ShopifyApiClientRequestOptions,
} from './client'
