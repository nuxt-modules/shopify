import type { ReturnData } from '@shopify/graphql-client'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions } from '#app'
import type { ShopifyApiClientRequestOptions } from '../../../module'
import type { ShopifyAsyncData, ShopifyAsyncDataOptions } from '../../utils/clients/async'

import { unref } from 'vue'
import { createError, useAsyncData } from '#app'
import { createAsyncDataKey, parseAsyncDataArguments } from '../../utils/clients/async'
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

export function useStorefrontData<
  Operation extends keyof StorefrontOperations,
  ResT = ReturnData<Operation, StorefrontOperations>,
>(...args: unknown[]) {
  if (args.length < 1 || args.length > 4) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Invalid number of arguments for `useStorefrontData`',
    })
  }

  const { key, operation, options, autoKey } = parseAsyncDataArguments<Operation, ShopifyAsyncDataOptions<Operation, StorefrontOperations, ResT, true>>(args)

  const { variables, headers, apiVersion, retries, signal, cache, ...asyncOptions } = options ?? {}

  const getVariables = () => {
    const source = unref(variables)

    if (!source) return source

    const resolved = {} as typeof source

    for (const key in source) {
      resolved[key] = unref(source[key])
    }

    return resolved
  }

  const getHeaders = () => unref(headers)

  const getCache = () => unref(cache)

  const handler = (_nuxtApp: unknown, context?: { signal?: AbortSignal }) => useStorefront().request(operation, {
    ...(variables ? { variables: getVariables() } : {}),
    ...(headers ? { headers: getHeaders() } : {}),
    ...(cache ? { cache: getCache() } : {}),
    ...(apiVersion ? { apiVersion } : {}),
    ...(retries !== undefined ? { retries } : {}),
    ...(signal ?? context?.signal ? { signal: signal ?? context?.signal } : {}),
  } as ShopifyApiClientRequestOptions<Operation, StorefrontOperations, true>).then(r => (r.data ?? null) as ResT)

  const asyncDataOptions = {
    ...asyncOptions,
    transform: async (data: ResT) => (asyncOptions.transform ? await asyncOptions.transform(data) : data) ?? null,
  } as AsyncDataOptions<ResT>

  return useAsyncData(
    key ?? createAsyncDataKey(autoKey, operation, getVariables()),
    handler,
    asyncDataOptions,
  )
}
