import type { AdminOptions, ModuleOptions, StorefrontOptions } from './module'
import type { CodegenConfig } from '@graphql-codegen/cli'
import type { HookResult, Nuxt } from '@nuxt/schema'

import '@nuxt/schema'
import 'nitropack'
import type { ApiClientOptions } from '~/src/types/module'

type NuxtShopifyCodegenHookParams = {
    nuxt: Nuxt
    generates: CodegenConfig['generates']
}

type NuxtShopifyPersistHookParams = {
    nuxt: Nuxt
    generates: CodegenConfig['generates']
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
        'shopify:storefront:codegen': (params: NuxtShopifyCodegenHookParams) => HookResult

        /**
         * Call/Called to generate the admin API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:admin:codegen': (params: NuxtShopifyCodegenHookParams) => HookResult

        /**
         * @wip
         *
         * Call/Called to generate the admin API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:customer:codegen': (params: NuxtShopifyCodegenHookParams) => HookResult

        /**
         * Call/Called to persist the storefront options
         * into the runtime config.
         */
        'shopify:storefront:persist': (nuxt: Nuxt, options?: ApiClientOptions) => HookResult

        /**
         * Call/Called to persist the admin options
         * into the runtime config.
         */
        'shopify:admin:persist': (nuxt: Nuxt, options?: ApiClientOptions) => HookResult

        /**
         * @wip
         *
         * Call/Called to persist the customer options
         * into the runtime config.
         */
        'shopify:customer:persist': (nuxt: Nuxt, options?: ApiClientOptions) => HookResult
    }
}

export * from './module'
