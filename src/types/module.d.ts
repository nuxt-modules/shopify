import type { ApiType, ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type {
    ApiClientLogger,
    CustomFetchApi,
} from '@shopify/graphql-client'

export type ApiClientOptions<T extends ApiType> = {
    storeDomain?: string
    apiVersion: string
    accessToken: string
    retries?: number
    customFetchApi?: CustomFetchApi
    logger?: ApiClientLogger
    codegen?: boolean | Omit<ShopifyApiTypesOptions, 'apiType' | 'apiVersion'>
    readonly _apiType?: Lowercase<T>
}

export type StorefrontOptions = ApiClientOptions<ApiType.Storefront> & {
    // Indicates whether it's a private or public access token
    private?: boolean
}

export type AdminOptions = ApiClientOptions<ApiType.Admin> & {
    userAgentPrefix?: string
    isTesting?: boolean
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
