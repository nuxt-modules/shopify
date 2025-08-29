import type { Types } from '@graphql-codegen/plugin-helpers'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type {
    AllOperations,
    ApiClientRequestOptions,
    ResponseErrors,
    ReturnData,
} from '@shopify/graphql-client'

import type {
    PublicShopifyConfig,
    ShopifyConfig,
    ShopifyAdminConfig,
    ShopifyStorefrontConfig,
} from './shopify'
import type {
    StorefrontApiClient,
    AdminApiClient,
} from './client'

export type ModuleOptions = ShopifyConfig<
    Partial<ShopifyStorefrontConfig>,
    Partial<ShopifyAdminConfig>
>

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export type ShopifyClientOptionHookParams = {
    options: GenericApiClientConfig
}

export type ShopifyClientHookParams<T = StorefrontApiClient | AdminApiClient> = {
    client: T
}

export type ShopifyClientRequestHookParams = {
    operation: keyof AllOperations
    options?: ApiClientRequestOptions<keyof AllOperations, AllOperations>
}

export type ShopifyClientResponseHookParams = {
    response: ClientResponse<ReturnData<keyof AllOperations, AllOperations>>
    operation: keyof AllOperations
    options?: ApiClientRequestOptions<keyof AllOperations, AllOperations>
}

export type ShopifyErrorHookParams = {
    errors: ResponseErrors
}

export type ShopifyTemplateHookParams = {
    nuxt: Nuxt
    config: Types.ConfiguredOutput
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
        shopify?: Omit<ShopifyConfig, 'clients' | 'autoImports'> & {
            clients?: {
                storefront: Partial<Omit<ShopifyStorefrontConfig, 'privateAccessToken' | 'skipCodegen' | 'sandbox' | 'documents'>>
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
        'storefront:client:configure': ({ options }: ShopifyClientOptionHookParams) => HookResult

        /**
         * Called after the storefront client is created within nuxt
         */
        'storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontApiClient>) => HookResult

        /**
         * Called before the storefront client sends a request within nuxt
         */
        'storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams) => HookResult

        /**
         * Called after the storefront client receives a response within nuxt
         */
        'storefront:client:response': ({ response }: ShopifyClientResponseHookParams) => HookResult

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
        'storefront:client:configure': ({ options }: ShopifyClientOptionHookParams) => HookResult

        /**
         * Called after the storefront client is created within nitro
         */
        'storefront:client:create': ({ client }: ShopifyClientHookParams<StorefrontApiClient>) => HookResult

        /**
         * Called before the storefront client sends a request within nitro
         */
        'storefront:client:request': ({ operation, options }: ShopifyClientRequestHookParams) => HookResult

        /**
         * Called after the storefront client receives a response within nitro
         */
        'storefront:client:response': ({ response }: ShopifyClientResponseHookParams) => HookResult

        /**
         * Called when the storefront client throws an error within nitro
         */
        'storefront:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult

        /**
         * Called before the admin client is created within nitro
         */
        'admin:client:configure': ({ options }: ShopifyClientOptionHookParams) => HookResult

        /**
         * Called after the admin client is created within nitro
         */
        'admin:client:create': ({ client }: ShopifyClientHookParams<AdminApiClient>) => HookResult

        /**
         * Called before the admin client sends a request within nitro
         */
        'admin:client:request': ({ operation, options }: ShopifyClientRequestHookParams) => HookResult

        /**
         * Called after the admin client receives a response within nitro
         */
        'admin:client:response': ({ response }: ShopifyClientResponseHookParams) => HookResult

        /**
         * Called when the admin client throws an error within nitro
         */
        'admin:client:errors': ({ errors }: ShopifyErrorHookParams) => HookResult
    }
}

export * from './client'
export * from './shopify'
