import type { AdminOptions, ModuleOptions } from './module'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { NuxtHooks } from 'nuxt/schema'

import '@nuxt/schema'
import 'nitropack'

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: ModuleOptions
    }

    interface NuxtHooks {
        /**
         * Call/Called to generate the storefront API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:codegen': (nuxt: Nuxt, options: ShopifyApiTypesOptions) => HookResult

        /**
         * Call/Called to persist the storefront options
         * into the runtime config.
         */
        'shopify:storefront:persist': (nuxt: Nuxt, options: AdminOptions) => HookResult

        /**
         * Call/Called to persist the admin options
         * into the runtime config.
         */
        'shopify:admin:persist': (nuxt: Nuxt, options: AdminOptions) => HookResult
    }
}

export type ShopifyPersistHookName = keyof NuxtHooks['shopify:storefront:persist'] | keyof NuxtHooks['shopify:admin:persist']
export * from './module'
