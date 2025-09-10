import type { HookResult, Nuxt } from '@nuxt/schema'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type {
    AllOperations,
    ApiClientRequestOptions,
    ClientResponse,
    ResponseErrors,
    ReturnData,
} from '@shopify/graphql-client'

import type {
    PublicShopifyConfig,
    ShopifyConfig,
    ShopifyAdminConfig,
    ShopifyStorefrontConfig,
    GenericApiClientConfig,
    GenericApiClient,
} from './shopify'

export type ModuleOptions = ShopifyConfig<
    Partial<Omit<ShopifyStorefrontConfig, 'storeDomain' | 'logger' | 'customFetchApi'>>,
    Partial<Omit<ShopifyAdminConfig, 'storeDomain' | 'logger' | 'customFetchApi'>>
>

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export type ShopifyClientOptionHookParams = {
    config: GenericApiClientConfig
}

export type ShopifyClientHookParams<Operations extends AllOperations> = {
    client: GenericApiClient<Operations>
}

export type ShopifyClientRequestHookParams<Operation extends keyof Operations, Operations extends AllOperations = AllOperations> = {
    operation: Operation
    options?: ApiClientRequestOptions<Operation, Operations>
}

export type ShopifyClientResponseHookParams<Operation extends keyof Operations, Operations extends AllOperations = AllOperations> = {
    response: ClientResponse<ReturnData<Operation, Operations>>
    operation: Operation
    options?: ApiClientRequestOptions<Operation, Operations>
}

export type ShopifyErrorHookParams = {
    errors: ResponseErrors
}

export type ShopifyTemplateHookParams = {
    nuxt: Nuxt
    config: Record<string, unknown>
}

export type SandboxConfig = {
    url: string
    headers: Record<string, string>
}

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        shopify?: ModuleOptions
        _shopify?: ShopifyConfig
        _sandbox?: Record<string, SandboxConfig>
    }

    interface PublicRuntimeConfig {
        shopify?: Omit<ModuleOptions, 'clients'> & {
            clients?: {
                storefront: Partial<Omit<ShopifyStorefrontConfig, 'storeDomain' | 'logger' | 'customFetchApi' | 'privateAccessToken'>>
            }
        }

        _shopify?: PublicShopifyConfig
    }

    interface NuxtHooks {
        /**
         * Called before the config is persisted into the runtime config
         */
        'shopify:config': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult

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
        'storefront:client:request': <Operation extends keyof AllOperations>({ operation, options }: ShopifyClientRequestHookParams<Operation, AllOperations>) => HookResult

        /**
         * Called after the storefront client receives a response within nuxt
         */
        'storefront:client:response': <Operation extends keyof AllOperations>({ response, operation, options }: ShopifyClientResponseHookParams<Operation, AllOperations>) => HookResult

        /**
         * Called when the storefront client throws an error within nuxt
         */
        'storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
    }
}

declare module 'nitropack' {
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
        'storefront:client:request': <Operation extends keyof AllOperations>({ operation, options }: ShopifyClientRequestHookParams<Operation, AllOperations>) => HookResult

        /**
         * Called after the storefront client receives a response within nitro
         */
        'storefront:client:response': <Operation extends keyof AllOperations>({ response, operation, options }: ShopifyClientResponseHookParams<Operation, AllOperations>) => HookResult

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
        'admin:client:request': <Operation extends keyof AllOperations>({ operation, options }: ShopifyClientRequestHookParams<Operation, AllOperations>) => HookResult

        /**
         * Called after the admin client receives a response within nitro
         */
        'admin:client:response': <Operation extends keyof AllOperations>({ response, operation, options }: ShopifyClientResponseHookParams<Operation, AllOperations>) => HookResult

        /**
         * Called when the admin client throws an error within nitro
         */
        'admin:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
    }
}

export * from './shopify'
