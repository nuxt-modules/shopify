import type { ApiType, ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type {
    ApiClientLogger,
    CustomFetchApi,
} from '@shopify/graphql-client'

export type ApiClientOptions = {
    storeDomain?: string
    apiVersion: string
    accessToken: string
    retries?: number
    customFetchApi?: CustomFetchApi
    logger?: ApiClientLogger
    codegen?: boolean | Omit<ShopifyApiTypesOptions, 'apiType', 'apiVersion'>
    readonly _apiType?: ApiType
}

export type StorefrontOptions = ApiClientOptions & {
    // Indicates whether it's a private or public access token
    private?: boolean
    readonly _apiType?: ApiType.Storefront
}

export type AdminOptions = ApiClientOptions & {
    userAgentPrefix?: string
    isTesting?: boolean
    readonly _apiType?: ApiType.Admin
}

export type ApiTypeToOptions = {
    [ApiType.Storefront]: StorefrontOptions
    [ApiType.Admin]: AdminOptions
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
