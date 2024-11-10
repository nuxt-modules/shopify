import type { ModuleOptions, AdminOptions, StorefrontOptions } from './module'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'

// import to make sure to merge and not overwrite the interfaces
import '@nuxt/schema'
import 'nitropack'

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify: ModuleOptions
    }

    interface NuxtHooks {
        /**
         * Call/Called to generate the storefront API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:codegen': (nuxt: Nuxt, config: ShopifyApiTypesOptions) => HookResult
    }
}

declare module 'nitropack' {
    interface NitroRuntimeHooks {
        /**
         * Called before the storefront client is created.
         * Can be used to load runtime specific options.
         */
        'shopify:storefront:init': (options: StorefrontOptions) => void

        /**
         * Called before the admin client is created.
         * Can be used to load runtime specific options.
         */
        'shopify:admin:init': (options: AdminOptions) => void
    }
}

export * from './module'
