import type { AdminOptions, ModuleOptions, StorefrontOptions } from './module'
import type { HookResult, Nuxt } from '@nuxt/schema'
import type { IGraphQLProject } from 'graphql-config'

import '@nuxt/schema'
import 'nitropack'
import type { CodegenConfig } from '@graphql-codegen/cli'

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
        'shopify:storefront:codegen': (nuxt: Nuxt, generates: CodegenConfig['generates']) => HookResult

        /**
         * Call/Called to generate the admin API types
         * or manipulate the config before
         * it is passed to the codegen.
         */
        'shopify:admin:codegen': (nuxt: Nuxt, generates: CodegenConfig['generates']) => HookResult

        /**
         * Call/Called to persist the storefront options
         * into the runtime config.
         */
        'shopify:storefront:persist': (nuxt: Nuxt, options: StorefrontOptions) => HookResult

        /**
         * Call/Called to persist the admin options
         * into the runtime config.
         */
        'shopify:admin:persist': (nuxt: Nuxt, options: AdminOptions) => HookResult
    }
}

export * from './module'
