import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'
import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import type { ShopifyAdminAuthCallbacks, ShopifyClientConfig, ShopifyClientOptions } from '../../../module'

import { createAdminApiClient } from './admin'
import { createCustomerAccountApiClient } from './customer-account'
import { createStorefrontApiClient } from './storefront'

type StorefrontClientOptions<Cache extends boolean | undefined> = ShopifyClientOptions<StorefrontOperations, Cache> & { client: 'storefront' }
type CustomerAccountClientOptions = ShopifyClientOptions<CustomerAccountOperations> & { client: 'customerAccount' }
type AdminClientOptions = ShopifyClientOptions<AdminOperations> & ShopifyAdminAuthCallbacks & { client: 'admin' }

export function createShopifyApiClient<Cache extends boolean | undefined = undefined>(config: ShopifyClientConfig<'storefront'>, options: StorefrontClientOptions<Cache>): StorefrontApiClient<Cache>
export function createShopifyApiClient(config: ShopifyClientConfig<'customerAccount'>, options: CustomerAccountClientOptions): CustomerAccountApiClient
export function createShopifyApiClient(config: ShopifyClientConfig<'admin'>, options: AdminClientOptions): AdminApiClient
export function createShopifyApiClient(config: ShopifyClientConfig, options: StorefrontClientOptions<boolean | undefined> | CustomerAccountClientOptions | AdminClientOptions) {
  switch (options.client) {
    case 'storefront':
      return createStorefrontApiClient(config, options)
    case 'customerAccount':
      return createCustomerAccountApiClient(config, options)
    case 'admin':
      return createAdminApiClient(config, options)
  }
}

export { createAdminApiClient } from './admin'
export { createCustomerAccountApiClient } from './customer-account'
export { createStorefrontApiClient } from './storefront'
