import type { ExposedShopifyConfig, ShopifyConfig } from './module'
import type { CodegenConfig } from '@graphql-codegen/cli'
import type { HookResult, Nuxt } from '@nuxt/schema'

import '@nuxt/schema'
import 'nitropack'

export type ModuleOptions = ShopifyConfig<
    Omit<ShopifyStorefrontConfig, 'storeDomain'>,
    Omit<ShopifyAdminConfig, 'storeDomain'>
>

export type ShopifyCodegenHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export type ShopifyCodegenResolvedHookParams = {
    nuxt: Nuxt
    generates: CodegenConfig['generates']
}

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ExposedShopifyConfig
}

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: ExposedShopifyConfig
    }

    interface NuxtHooks {
        /**
         * Call/Called to generate the storefront API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:codegen': ({ nuxt, config }: ShopifyCodegenHookParams) => HookResult

        'shopify:codegen:generate': ({ nuxt, generates }: ShopifyCodegenResolvedHookParams) => HookResult

        /**
         * Call/Called to persist the config into runtime.
         */
        'shopify:config': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult
    }
}

export * from './shopify'
