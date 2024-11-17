import type {
    ShopifyAdminConfig,
    ShopifyConfig,
    ShopifyStorefrontConfig,
} from './shopify'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type {
    AdminOptions,
    StorefrontOptions,
} from '~/src/types/shopify'

import '@nuxt/schema'
import 'nitropack'

export type ModuleOptions = ShopifyConfig<
    Omit<ShopifyStorefrontConfig, 'storeDomain'>,
    Omit<ShopifyAdminConfig, 'storeDomain'>
>

export type ShopifyConfigHookParams = {
    nuxt: Nuxt
    config: ShopifyConfig<StorefrontOptions, AdminOptions>
}

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: ShopifyConfig<StorefrontOptions, AdminOptions>
    }

    interface NuxtHooks {
        /**
         * Call/Called to persist the config into runtime.
         */
        'shopify:config': ({ nuxt, config }: ShopifyConfigHookParams) => HookResult
    }
}

export * from './shopify'
