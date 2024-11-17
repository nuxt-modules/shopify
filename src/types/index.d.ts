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

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: ShopifyConfig
    }

    interface NuxtHooks {
        /**
         * Call/Called to persist the config into runtime.
         */
        'shopify:config': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult
    }
}

export * from './shopify'
