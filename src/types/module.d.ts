import type { createAdminApiClient } from '@shopify/admin-api-client'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { createStorefrontApiClient } from '@shopify/storefront-api-client'

export type NormalizedShopifyApiTypesOptions = Omit<ShopifyApiTypesOptions, 'apiType' | 'apiVersion'>

type StorefrontOptions = Parameters<typeof createStorefrontApiClient>[0]
type AdminOptions = Parameters<typeof createAdminApiClient>[0]

export type ModuleOptions = {
    name: string
    debug?: boolean
    clients: {
        storefront?: Omit<StorefrontOptions, 'storeDomain'> & {
            codegen?: boolean | NormalizedShopifyApiTypesOptions
        }
        admin?: Omit<AdminOptions, 'storeDomain'> & {
            codegen?: boolean | NormalizedShopifyApiTypesOptions
        }
    }
}

type ShopifyConfig = {
    name: string
    debug?: boolean
    clients: {
        storefront?: StorefrontOptions & {
            storeDomain: string
            codegen?: ShopifyApiTypesOptions
        }
        admin?: AdminOptions & {
            storeDomain: string
            codegen?: ShopifyApiTypesOptions
        }
    }
}

export type ShopifyClientType = keyof ModuleOptions['clients']
