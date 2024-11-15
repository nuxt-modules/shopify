import type { createAdminApiClient } from '@shopify/admin-api-client'
import type { createStorefrontApiClient } from '@shopify/storefront-api-client'

type StorefrontOptions = Parameters<typeof createStorefrontApiClient>[0]
type AdminOptions = Parameters<typeof createAdminApiClient>[0]

declare enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

export type InterfaceExtensionsParams = {
    queryType: string
    mutationType: string
}

export type ShopifyStorefrontConfig = StorefrontOptions & {
    skipCodegen?: boolean
    documents?: string[]
}

export type ShopifyAdminConfig = AdminOptions & {
    skipCodegen?: boolean
    documents?: string[]
}

export type ShopifyClientConfig = ShopifyStorefrontConfig | ShopifyAdminConfig

export type ShopifyConfig = {
    name: string
    debug?: boolean
    clients: {
        [ShopifyClientType.Storefront]?: ShopifyStorefrontConfig
        [ShopifyClientType.Admin]?: ShopifyAdminConfig
    }
}

export type ModuleOptions = {
    name: string
    debug?: boolean
    clients: {
        [ShopifyClientType.Storefront]?: Omit<ShopifyStorefrontConfig, 'storeDomain'>
        [ShopifyClientType.Admin]?: Omit<ShopifyAdminConfig, 'storeDomain'>
    }
}

export type ShopifyTypeTemplateOptions = {
    clientType: ShopifyClientType
    clientConfig: ShopifyClientConfig
}
