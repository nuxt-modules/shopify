import type { ModuleOptions } from './module'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { ApiClientOptions } from '~/src/types/module'

import '@nuxt/schema'
import 'nitropack'

export type CodegenHookParams = {
    nuxt: Nuxt
    options: ShopifyApiTypesOptions
}

export type PersistHookParams = {
    nuxt: Nuxt
    options?: ApiClientOptions
}

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
        'shopify:storefront:codegen': (params: CodegenHookParams) => HookResult

        /**
         * Call/Called to generate the admin API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:admin:codegen': (params: CodegenHookParams) => HookResult

        /**
         * @wip
         *
         * Call/Called to generate the admin API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:customer:codegen': (params: CodegenHookParams) => HookResult

        /**
         * Call/Called to persist the storefront options
         * into the runtime config.
         */
        'shopify:storefront:persist': (params: PersistHookParams) => HookResult

        /**
         * Call/Called to persist the admin options
         * into the runtime config.
         */
        'shopify:admin:persist': (params: PersistHookParams) => HookResult

        /**
         * @wip
         *
         * Call/Called to persist the customer options
         * into the runtime config.
         */
        'shopify:customer:persist': (params: PersistHookParams) => HookResult
    }
}

export * from './module'
