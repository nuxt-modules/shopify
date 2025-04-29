import type {
    PublicShopifyConfig,
    ShopifyConfig,
    ShopifyAdminConfig,
    ShopifyStorefrontConfig,
    StorefrontOptions,
    AdminOptions,
} from './shopify'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type { AdminApiClient } from '@shopify/admin-api-client'
import type { StorefrontApiClient } from '@shopify/storefront-api-client'

import '@nuxt/schema'
import 'nitropack'
import '#app'

export type ModuleOptions = ShopifyConfig<
    Omit<ShopifyStorefrontConfig, 'storeDomain'>,
    Omit<ShopifyAdminConfig, 'storeDomain'>
>

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export type ShopifyClientOptionHookParams<T = StorefrontOptions | AdminOptions> = {
    options: T
}

export type ShopifyClientHookParams<T = StorefrontApiClient | AdminApiClient> = {
    client: T
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
        _shopify?: ShopifyConfig
        _sandbox?: Record<string, SandboxConfig>
    }

    interface PublicRuntimeConfig {
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
        'storefront:client:create': ({ options }: ShopifyClientOptionHookParams<Omit<StorefrontOptions, 'privateAccessToken'>>) => HookResult

        /**
         * Called after the storefront client is created within nuxt
         */
        'storefront:client:created': ({ client }: ShopifyClientHookParams<StorefrontApiClient>) => HookResult
    }
}

declare module 'nitropack' {
    interface NitroRuntimeHooks {
        /**
         * Called before the storefront client is created within nitro
         */
        'storefront:client:create': ({ options }: ShopifyClientOptionHookParams<StorefrontOptions>) => HookResult

        /**
         * Called after the storefront client is created within nitro
         */
        'storefront:client:created': ({ client }: ShopifyClientHookParams<StorefrontApiClient>) => HookResult

        /**
         * Called after the admin client is created within nitro
         */
        'admin:client:create': ({ options }: ShopifyClientOptionHookParams<AdminOptions>) => HookResult

        /**
         * Called when the admin client is created within nitro
         */
        'admin:client:created': ({ client }: ShopifyClientHookParams<AdminApiClient>) => HookResult
    }
}

export * from './shopify'
