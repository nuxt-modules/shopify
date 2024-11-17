import type { createAdminApiClient } from '@shopify/admin-api-client'
import type { createStorefrontApiClient } from '@shopify/storefront-api-client'

// @TODO Rethink the architecture, there are still some flaws to it

type StorefrontOptions = Parameters<typeof createStorefrontApiClient>[0]
type AdminOptions = Parameters<typeof createAdminApiClient>[0]

// The supported client types
declare enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

// custom options for each client
// exposed via module options
export type ShopifyClientCustomConfig = {
    skipCodegen?: boolean
    sandbox?: true
    documents?: string[]
}

export type ShopifyStorefrontConfig = StorefrontOptions & ShopifyClientCustomConfig
export type ShopifyAdminConfig = AdminOptions & ShopifyClientCustomConfig

// Intermediate shopify config
// Module options will omit the storeDomain from each client
// Runtime config will omit the custom config from each client
export type ShopifyConfig<S = ShopifyStorefrontConfig, A = ShopifyAdminConfig> = {
    name: string
    debug?: boolean
    clients: {
        [ShopifyClientType.Storefront]?: S
        [ShopifyClientType.Admin]?: A
    }
}

// Any client config
export type ShopifyClientConfig = ShopifyStorefrontConfig | ShopifyAdminConfig

// Config that is exposed to the runtime after setup
export type ExposedShopifyConfig = ShopifyConfig<StorefrontOptions,AdminOptions>

// Options for custom templates
export type ShopifyTypeTemplateOptions = {
    clientType: ShopifyClientType
    clientConfig: ShopifyClientConfig
}

// Params for the codegen interface extension function from shopify codegen preset
export type InterfaceExtensionsParams = {
    queryType: string
    mutationType: string
}


