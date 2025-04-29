import type { createAdminApiClient } from '@shopify/admin-api-client'
import type { createStorefrontApiClient } from '@shopify/storefront-api-client'
import type { ConsolaOptions } from 'consola'

export type StorefrontOptions = Parameters<typeof createStorefrontApiClient>[0]
export type AdminOptions = Parameters<typeof createAdminApiClient>[0]

// The supported client types
declare enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

// custom options for each client
// exposed via module options
export type ShopifyClientCustomConfig = {
    skipCodegen?: boolean
    sandbox?: boolean // defaults to true
    documents?: string[]
}

export type ShopifyStorefrontConfig = StorefrontOptions & ShopifyClientCustomConfig
export type ShopifyAdminConfig = AdminOptions & ShopifyClientCustomConfig
export type ShopifyClientConfig = ShopifyStorefrontConfig | ShopifyAdminConfig

// Fully resolved shopify config
export type ShopifyConfig<S = ShopifyStorefrontConfig, A = ShopifyAdminConfig> = {
    name: string
    logger?: Partial<ConsolaOptions>
    clients: {
        [ShopifyClientType.Storefront]?: S
        [ShopifyClientType.Admin]?: A
    }
}

// Optional public config for client side usage
export type PublicShopifyConfig = Omit<
    ShopifyStorefrontConfig,
    'privateAccessToken' | 'skipCodegen' | 'sandbox' | 'documents'
>

// Options for custom templates
export type ShopifyTemplateOptions = {
    filename: string
    clientType: ShopifyClientType
    clientConfig: ShopifyClientConfig
    introspection?: string
}

// Params for the interface extension function from the shopify codegen preset
export type InterfaceExtensionsParams = {
    queryType: string
    mutationType: string
}
