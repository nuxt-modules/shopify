/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReturnData, OperationVariables } from '@shopify/graphql-client'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { MaybeRef, MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'
import type { ShopifyApiClientRequestOptions } from '../../../module'

import { unref } from 'vue'
import { useAsyncData } from '#app'
import { useStorefront } from '../storefront'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type StorefrontDataRequestOptions<Operation extends keyof StorefrontOperations> = {
    apiVersion?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['apiVersion']
    retries?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['retries']
    signal?: ShopifyApiClientRequestOptions<Operation, StorefrontOperations>['signal']
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
    ) | undefined,
    (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | null | undefined
>

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
    ) | undefined,
    (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | null | undefined
>

export function useStorefrontData<
    Operation extends keyof StorefrontOperations,
    ResT = ReturnData<Operation, StorefrontOperations>,
>(...args: any[]) {
    if (args.length < 1 || args.length > 3) {
        throw new Error('[shopify] [useStorefrontData] Invalid number of arguments')
    }

    const key = typeof args[1] === 'string' ? args[0] as MaybeRefOrGetter<string> : undefined
    const operation = (key ? args[1] : args[0]) as Operation
    const options = (key ? args[2] : args[1]) as StorefrontDataOptions<Operation, ResT> | undefined

    const { variables, headers, apiVersion, retries, signal, ...asyncOptions } = options ?? {}

    const getVariables = () => {
        const v = unref(variables)
        for (const key in v) {
            v[key] = unref(v[key])
        }
        return v
    }

    const getHeaders = () => unref(headers)

    const handler = () => useStorefront().request(operation, {
        ...(variables ? { variables: getVariables() } : {}),
        ...(headers ? { headers: getHeaders() } : {}),
        ...(apiVersion ? { apiVersion } : {}),
        ...(retries ? { retries } : {}),
        ...(signal ? { signal } : {}),
    } as ShopifyApiClientRequestOptions<Operation, StorefrontOperations>).then(r => r.data!)

    return key
        ? useAsyncData(key, handler, asyncOptions as AsyncDataOptions<ResT>)
        : useAsyncData(handler, asyncOptions as AsyncDataOptions<ResT>)
}
