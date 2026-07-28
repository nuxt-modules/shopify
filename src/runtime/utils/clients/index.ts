/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations } from '@shopify/graphql-client'

import type { ShopifyClientConfig, ShopifyGenericClientOptions, ShopifyApiClient } from '../../../module'

import { createAdminClient } from './admin'
import { createCustomerAccountClient } from './customer-account'
import { createStorefrontClient } from './storefront'

export function createShopifyClient<
  Operations extends AllOperations = AllOperations,
  Cache extends boolean | undefined = undefined,
>(
  config: ShopifyClientConfig,
  options: ShopifyGenericClientOptions<Operations, Cache>,
): ShopifyApiClient<Operations, Cache> {
  switch (options.client) {
    case 'storefront':
      return createStorefrontClient(config, options as any) as unknown as ShopifyApiClient<Operations, Cache>
    case 'customerAccount':
      return createCustomerAccountClient(config, options as any) as unknown as ShopifyApiClient<Operations, Cache>
    case 'admin':
      return createAdminClient(config, options as any) as unknown as ShopifyApiClient<Operations, Cache>
  }
}

export { createAdminClient, createAdminConfig } from './admin'
export { createCustomerAccountClient, createCustomerAccountConfig } from './customer-account'
export { createStorefrontClient, createStorefrontConfig } from './storefront'
