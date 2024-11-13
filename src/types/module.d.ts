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
        storefront?: StorefrontOptions & {
            codegen?: boolean | NormalizedShopifyApiTypesOptions // default: true
        }
        admin?: AdminOptions & {
            codegen?: boolean | NormalizedShopifyApiTypesOptions // default: true
        }
    }
}
