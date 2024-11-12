import type { ApiType, ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type {
    ApiClientLogger,
    CustomFetchApi,
} from '@shopify/graphql-client'

export type NormalizedShopifyApiTypesOptions = Omit<ShopifyApiTypesOptions, 'apiType' | 'apiVersion'>

export type ApiClientOptions = {
    storeDomain?: string
    apiVersion: string
    accessToken: string
    retries?: number
    customFetchApi?: CustomFetchApi
    logger?: ApiClientLogger
    codegen?: boolean | NormalizedShopifyApiTypesOptions
}

export type StorefrontOptions = ApiClientOptions & {
    // Indicates whether it's a private or public access token
    private?: boolean
}

export type AdminOptions = ApiClientOptions & {
    userAgentPrefix?: string
    isTesting?: boolean
}

export type ApiTypeToOptions = {
    [ApiType.Storefront]: StorefrontOptions
    [ApiType.Admin]: AdminOptions
    [ApiType.Customer]: undefined
}

export type ApiTypeToResolvedOptions = {
    [ApiType.Storefront]: StorefrontOptions & {
        storeDomain: string
        codegen: ShopifyApiTypesOptions
    }

    [ApiType.Admin]: AdminOptions & {
        storeDomain: string
        codegen: ShopifyApiTypesOptions
    }

    [ApiType.Customer]: undefined
}

export type ModuleOptionsClients = {
    storefront: StorefrontOptions
    admin: AdminOptions
}

export type ModuleOptions = {
    name: string
    debug?: boolean
    clients: Partial<ModuleOptionsClients>
}
