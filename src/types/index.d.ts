import type { HookResult } from '@nuxt/schema'
import type { Nuxt } from '@nuxt/schema/dist'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { NuxtShopify } from './mod'

// import to make sure to merge and not overwrite the interfaces
import '@nuxt/schema'
import 'nitropack'

export type HookShopifyPrepareOptions = {
    nuxt: Nuxt
    options: NuxtShopify.ModuleOptions
    codegenOptions?: ShopifyApiTypesOptions
}

export type HookShopifyCodegenOptions = {
    nuxt: Nuxt
    codegenOptions: ShopifyApiTypesOptions
}

declare module '@nuxt/schema' {
    interface RuntimeConfig {
        _shopify?: NuxtShopify.ModuleOptions
    }

    interface NuxtHooks {
        /**
         * Called when api options are being prepared
         */
        'shopify:prepare': (options: HookShopifyPrepareOptions) => HookResult

        /**
         * Called to generate the storefront API types
         */
        'shopify:codegen': (config: HookShopifyCodegenOptions) => HookResult
    }
}

declare module 'nitropack' {
    interface NitroRuntimeHooks {
        /**
         * Called before the storefront client is created
         */
        'shopify:storefront:init': (options: NuxtShopify.StorefrontOptions) => void

        /**
         * Called before the admin client is created
         */
        'shopify:admin:init': (options: NuxtShopify.AdminOptions) => void
    }
}

export type { NuxtShopify }
