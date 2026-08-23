/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReturnData, OperationVariables } from '@shopify/graphql-client'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { MaybeRef, MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'
import type { ShopifyApiClientRequestOptions } from '../../../module'

import { unref } from 'vue'
import { createError, useAsyncData } from '#app'
import { createAsyncDataKey, parseAsyncDataArguments } from '../../utils/clients/async'
import { useStorefront } from './client'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type StorefrontDataRequestOptions<Operation extends keyof StorefrontOperations> = {
  apiVersion?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['apiVersion']
  retries?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['retries']
  signal?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['signal']
  cache?: MaybeRef<ShopifyApiClientRequestOptions<Operation, StorefrontOperations, true>['cache']>
  headers?: MaybeRef<ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['headers']>
  variables?: MaybeRef<{ [k in keyof OperationVariables<Operation, StorefrontOperations>['variables']]: MaybeRef<OperationVariables<Operation, StorefrontOperations>['variables'][k]> }>
}

type InferDataType<ResT, Options> = Options extends { transform: (data: ResT) => infer R }
  ? R extends Promise<infer T> ? T : R
  : ResT

type InferPickType<ResT, Options> = Options extends { pick: infer P }
  ? P extends KeysOf<ResT> ? PickFrom<ResT, P> : ResT
  : ResT

type StorefrontDataOptions<Operation extends keyof StorefrontOperations, ResT>
  = StorefrontDataRequestOptions<Operation>
    & Omit<AsyncDataOptions<ResT>, 'transform' | 'pick'> & {
      transform?: (data: ResT) => any
      pick?: KeysOf<ResT>
    }

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
  Options extends StorefrontDataOptions<Operation, ResT> = StorefrontDataOptions<Operation, ResT>,
  NuxtErrorDataT = unknown,
>(
  operation: Operation,
  options?: Options,
): AsyncData<
    (Options extends { transform: any }
      ? InferDataType<ResT, Options>
      : Options extends { pick: any }
        ? InferPickType<ResT, Options>
        : ResT
    ) | null | undefined,
    (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | null | undefined
>

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
  Options extends StorefrontDataOptions<Operation, ResT> = StorefrontDataOptions<Operation, ResT>,
  NuxtErrorDataT = unknown,
>(
  key: MaybeRefOrGetter<string>,
  operation: Operation,
  options?: Options,
): AsyncData<
    (Options extends { transform: any }
      ? InferDataType<ResT, Options>
      : Options extends { pick: any }
        ? InferPickType<ResT, Options>
        : ResT
    ) | null | undefined,
    (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | null | undefined
>

export function useStorefrontData<
  Operation extends keyof StorefrontOperations,
  ResT = ReturnData<Operation, StorefrontOperations>,
>(...args: any[]) {
  if (args.length < 1 || args.length > 4) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] [useStorefrontData] Invalid number of arguments',
    })
  }

  const { key, operation, options, autoKey } = parseAsyncDataArguments<Operation, StorefrontDataOptions<Operation, ResT>>(args)

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

  const handler = () => useStorefront().request(operation, {
    ...(variables ? { variables: getVariables() } : {}),
    ...(headers ? { headers: getHeaders() } : {}),
    ...(cache ? { cache: getCache() } : {}),
    ...(apiVersion ? { apiVersion } : {}),
    ...(retries !== undefined ? { retries } : {}),
    ...(signal ? { signal } : {}),
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
