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
    sandbox?: boolean
    documents?: string[]
}


export type ShopifyAdminConfig = AdminOptions & {
    skipCodegen?: boolean
    sandbox?: boolean
    documents?: string[]
}

export type ShopifyClientConfig = ShopifyStorefrontConfig | ShopifyAdminConfig

export type ShopifyConfig<
    StorefrontConfig = ShopifyStorefrontConfig,
    AdminConfig = ShopifyAdminConfig,
> = {
    name: string
    debug?: boolean
    clients: {
        [ShopifyClientType.Storefront]?: StorefrontConfig
        [ShopifyClientType.Admin]?: AdminConfig
    }
}

export type ExposedShopifyConfig = ShopifyConfig<
    StorefrontOptions,
    AdminOptions
>

export type ModuleOptions = ShopifyConfig<
    Omit<ShopifyStorefrontConfig, 'storeDomain'>,
    Omit<ShopifyAdminConfig, 'storeDomain'>
>

export type ShopifyTypeTemplateOptions = {
    clientType: ShopifyClientType
    clientConfig: ShopifyClientConfig
}
