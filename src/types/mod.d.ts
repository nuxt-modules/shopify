import type { ShopifyApiTypesOptions, ApiType } from '@shopify/api-codegen-preset'
import type { createAdminApiClient } from '@shopify/admin-api-client'
import type { createStorefrontApiClient } from '@shopify/storefront-api-client'

type CreateStorefrontApiClientParams = Parameters<typeof createStorefrontApiClient>[0]
type CreateAdminApiClientParams = Parameters<typeof createAdminApiClient>[0]

type Normalize<T> = Omit<T, 'storeDomain' | 'apiVersion'>

export namespace NuxtShopify {
    export type ClientBaseOptions = {
        apiVersion: string
        codegen?: boolean | ShopifyApiTypesOptions
    }

    export type StorefrontOptions = Normalize<CreateStorefrontApiClientParams> & ClientBaseOptions & {
        publicAccessToken?: never
        privateAccessToken: string
    } | {
        publicAccessToken: string
        privateAccessToken?: never
    }

    export type AdminOptions = Normalize<CreateAdminApiClientParams> & ClientBaseOptions

    export type ApiTypeOptions = {
        storefront: StorefrontOptions
        admin: AdminOptions
    }

    export type OptionsForApiType<T extends ApiType> = ApiTypeOptions[Lowercase<T> & keyof ApiTypeOptions]

    export type ModuleOptions = {
        name: string
        debug?: boolean
        clients?: Partial<ApiTypeOptions>
    }
}
