import type { ApiClientConfig } from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'

import type { ShopifyClientType } from '../utils'

export type ApiClientCustomConfig = {
    skipCodegen?: boolean
    sandbox?: boolean
    documents?: string[]
}

export type StorefrontApiClientCustomConfig = {
    mock?: boolean
    publicAccessToken?: string
    privateAccessToken?: string
}

export type AdminApiClientCustomConfig = {
    accessToken: string
}

export type ShopifyApiClientConfig = Omit<ApiClientConfig, 'storeDomain' | 'apiUrl'>

export type ShopifyStorefrontConfig = ShopifyApiClientConfig & ApiClientCustomConfig & StorefrontApiClientCustomConfig
export type ShopifyAdminConfig = ShopifyApiClientConfig & ApiClientCustomConfig & AdminApiClientCustomConfig

export type ShopifyClientConfig = ShopifyStorefrontConfig | ShopifyAdminConfig

// Fully resolved shopify config
export type ShopifyConfig<
    S = ShopifyStorefrontConfig,
    A = ShopifyAdminConfig,
> = {
    name: string
    logger?: Partial<ConsolaOptions>
    autoImports?: {
        graphql?: boolean
        storefront?: boolean
        admin?: boolean
    }
    errors?: {
        throw?: boolean
    }
    clients: {
        [ShopifyClientType.Storefront]?: S
        [ShopifyClientType.Admin]?: A
    }
}

// Optional public config for client side usage
export type PublicShopifyConfig<S = ShopifyStorefrontConfig> = {
    name: string
    logger?: Partial<ConsolaOptions>
    errors?: {
        throw?: boolean
    }
    clients: {
        [ShopifyClientType.Storefront]?: Omit<S, 'privateAccessToken' | 'skipCodegen' | 'sandbox' | 'documents'>
    }
}

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
