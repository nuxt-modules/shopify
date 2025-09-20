/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations, ApiClientRequestOptions, ReturnData } from '@shopify/graphql-client'
import type { MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'

import { useAsyncData } from '#app'

import { useStorefront } from './storefront'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type ResT<Operation extends keyof AllOperations> = ReturnData<Operation, StorefrontOperations>
type RequestOptions<Operation extends keyof AllOperations> = ApiClientRequestOptions<Operation, StorefrontOperations>

const isRequestOptions = <T extends object | undefined>(obj?: object): obj is T =>
    Object.keys(obj ?? {}).some(key => ['apiVersion', 'headers', 'retries', 'signal', 'variables'].includes(key))

const isAsyncDataOptions = <T extends object | undefined>(obj?: object): obj is T =>
    Object.keys(obj ?? {}).some(key => ['server', 'lazy', 'default', 'getCachedData', 'transform', 'pick', 'watch', 'immediate', 'deep', 'dedupe'].includes(key))

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends RequestOptions<Operation> | undefined = undefined,
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    operation: Operation,
    options?: Options,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    operation: Operation,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    key: MaybeRefOrGetter<string>,
    operation: Operation,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends RequestOptions<Operation> | undefined = undefined,
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    key: MaybeRefOrGetter<string>,
    operation: Operation,
    options?: Options,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends RequestOptions<Operation> | undefined = undefined,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    ...args: any[]
) {
    if (args.length < 1 || args.length > 4) {
        throw new Error('[shopify] [useAsyncStorefront] Invalid number of arguments')
    }

    type AsyncOptions = AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>

    const key = typeof args[1] === 'string' ? args[0] as MaybeRefOrGetter<string> : undefined
    const operation = (key ? args[1] : args[0]) as Operation
    const options = (key && isRequestOptions<Options>(args[2]) ? args[2] : isRequestOptions<Options>(args[1]) ? args[1] : undefined)
    const asyncOptions = (key && isAsyncDataOptions<AsyncOptions>(args[3]) ? args[3] : isAsyncDataOptions<AsyncOptions>(args[2]) ? args[2] : undefined)

    const handler = () => useStorefront().request(operation, options).then(r => r.data!)

    return key
        ? useAsyncData(key, handler, asyncOptions)
        : useAsyncData(handler, asyncOptions)
}
