import type { ReturnData } from '@shopify/graphql-client'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { MaybeRefOrGetter } from 'vue'

import type { ShopifyAsyncData, ShopifyAsyncDataOptions } from '../../utils/clients/async'

import { useClientAsyncData } from '../../utils/clients/async'
import { useCustomerAccount } from './client'

/**
 * Runs a Customer Account API operation through `useAsyncData`.
 *
 * @param operation the GraphQL operation to run
 * @param options request options
 *
 * @returns the `useAsyncData` result holding the operation's data
 */
export function useCustomerAccountData<
  Operation extends keyof CustomerAccountOperations,
  ResT = ReturnData<Operation, CustomerAccountOperations>,
  Options extends ShopifyAsyncDataOptions<Operation, CustomerAccountOperations, ResT> = ShopifyAsyncDataOptions<Operation, CustomerAccountOperations, ResT>,
  NuxtErrorDataT = unknown,
>(
  operation: Operation,
  options?: Options,
): ShopifyAsyncData<ResT, Options, NuxtErrorDataT>

/**
 * Runs a Customer Account API operation through `useAsyncData`.
 *
 * @param key the key to use for the `useAsyncData` result
 * @param operation the GraphQL operation to run
 * @param options request options
 *
 * @returns the `useAsyncData` result holding the operation's data
 */
export function useCustomerAccountData<
  Operation extends keyof CustomerAccountOperations,
  ResT = ReturnData<Operation, CustomerAccountOperations>,
  Options extends ShopifyAsyncDataOptions<Operation, CustomerAccountOperations, ResT> = ShopifyAsyncDataOptions<Operation, CustomerAccountOperations, ResT>,
  NuxtErrorDataT = unknown,
>(
  key: MaybeRefOrGetter<string>,
  operation: Operation,
  options?: Options,
): ShopifyAsyncData<ResT, Options, NuxtErrorDataT>

export function useCustomerAccountData(...args: unknown[]) {
  return useClientAsyncData('useCustomerAccountData', useCustomerAccount, args)
}
