import type { ReturnData } from '@shopify/graphql-client'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { MaybeRefOrGetter } from 'vue'

import type { ShopifyAsyncData, ShopifyAsyncDataOptions } from '../async'

import { useClientAsyncData } from '../async'
import { useStorefront } from './client'

/**
 * Runs a Storefront API operation through `useAsyncData`.
 *
 * @param operation the GraphQL operation to run
 * @param options request options
 *
 * @returns the `useAsyncData` result holding the operation's data
 */
export function useStorefrontData<
  Operation extends keyof StorefrontOperations,
  ResT = ReturnData<Operation, StorefrontOperations>,
  Options extends ShopifyAsyncDataOptions<Operation, StorefrontOperations, ResT, true> = ShopifyAsyncDataOptions<Operation, StorefrontOperations, ResT, true>,
  NuxtErrorDataT = unknown,
>(
  operation: Operation,
  options?: Options,
): ShopifyAsyncData<ResT, Options, NuxtErrorDataT>

/**
 * Runs a Storefront API operation through `useAsyncData`.
 *
 * @param key the key to use for the `useAsyncData` result
 * @param operation the GraphQL operation to run
 * @param options request options
 *
 * @returns the `useAsyncData` result holding the operation's data
 */
export function useStorefrontData<
  Operation extends keyof StorefrontOperations,
  ResT = ReturnData<Operation, StorefrontOperations>,
  Options extends ShopifyAsyncDataOptions<Operation, StorefrontOperations, ResT, true> = ShopifyAsyncDataOptions<Operation, StorefrontOperations, ResT, true>,
  NuxtErrorDataT = unknown,
>(
  key: MaybeRefOrGetter<string>,
  operation: Operation,
  options?: Options,
): ShopifyAsyncData<ResT, Options, NuxtErrorDataT>

export function useStorefrontData(...args: unknown[]) {
  return useClientAsyncData('useStorefrontData', useStorefront, args)
}
