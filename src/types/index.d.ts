import type {
    ShopifyAdminConfig,
    ShopifyConfig,
    ShopifyStorefrontConfig,
} from './shopify'
import type { HookResult, Nuxt } from '@nuxt/schema'

import '@nuxt/schema'
import 'nitropack'

export type ModuleOptions = ShopifyConfig<
    Omit<ShopifyStorefrontConfig, 'storeDomain'>,
    Omit<ShopifyAdminConfig, 'storeDomain'>
>

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
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
         * Called before the admin introspection schema is generated
         */
        'admin:generate:introspection': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

        /**
         * Called before the storefront types are generated
         */
        'storefront:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

        /**
         * Called before the admin types are generated
         */
        'admin:generate:types': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResul

        /**
         * Called before the storefront operations are generated
         */
        'storefront:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult

        /**
         * Called before the admin operations are generated
         */
        'admin:generate:operations': ({ nuxt, config }: ShopifyTemplateHookParams) => HookResult
    }
}

export * from './shopify'
