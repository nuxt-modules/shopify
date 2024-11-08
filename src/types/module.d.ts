import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { ApiClientLogger, CustomFetchApi } from '@shopify/graphql-client'

export type ApiClientOptions = {
    storeDomain?: string
    apiVersion: string
    accessToken: string
    retries?: number
    customFetchApi?: CustomFetchApi
    logger?: ApiClientLogger
    codegen?: boolean | Omit<ShopifyApiTypesOptions, 'apiType', 'apiVersion'>
}

export type StorefrontOptions = ApiClientOptions & {
    private?: boolean // Indicates if it's a private access token
}

export type AdminOptions = ApiClientOptions & {
    userAgentPrefix?: string
    isTesting?: boolean
}

export type ModuleOptionsClients = {
    storefront: StorefrontOptions
    admin: AdminOptions
}

export type ModuleOptions = {
    name: string
    debug?: boolean
    clients?: Partial<ModuleOptionsClients>
}
