import type { HookResult } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { ModuleOptions, AdminOptions, StorefrontOptions } from './module'

// import to make sure to merge and not overwrite the interfaces
import '@nuxt/schema'
import 'nitropack'

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: ModuleOptions
    }

    interface NuxtHooks {
        /**
         * Called to generate the storefront API types
         */
        'shopify:codegen': (config: ShopifyApiTypesOptions) => HookResult
    }
}

declare module 'nitropack' {
    interface NitroRuntimeHooks {
        /**
         * Called before the storefront client is created
         */
        'shopify:storefront:init': (options: StorefrontOptions) => void

        /**
         * Called before the admin client is created
         */
        'shopify:admin:init': (options: AdminOptions) => void
    }
}

export * from './module'
