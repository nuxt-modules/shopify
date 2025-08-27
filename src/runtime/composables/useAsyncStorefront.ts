/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations, ApiClientRequestOptions, StorefrontOperations, ReturnData } from '@shopify/storefront-api-client'
import type { MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'

import { useAsyncData } from '#app'

import { useStorefront } from './useStorefront'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type ResT<Operation extends keyof AllOperations> = ReturnData<Operation, StorefrontOperations>
type RequestOptions<Operation extends keyof AllOperations> = ApiClientRequestOptions<Operation, StorefrontOperations>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends RequestOptions<Operation> | undefined = undefined,
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    operation: Operation,
    options: Options,
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
    options: Options,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends RequestOptions<Operation> | undefined = undefined,
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    ...args: any[]
): AsyncData<PickFrom<DataT, PickKeys>, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined> {
    if (args.length < 3 || args.length > 4) {
        throw new Error('[shopify] [useAsyncStorefront] Invalid number of arguments')
    }

    const hasKey = args.length === 4

    if (!hasKey) {
        args.unshift('')
    }

    const [key, operation, options, asyncOptions = {}] = args as [MaybeRefOrGetter<string>, Operation, Options, AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>]

    const handler = () => useStorefront().request(operation, options).then(r => r.data!)

    if (hasKey) {
        return useAsyncData(key, handler, asyncOptions) as AsyncData<PickFrom<DataT, PickKeys>, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>)>
    }

    return useAsyncData(handler, asyncOptions) as AsyncData<PickFrom<DataT, PickKeys>, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>)>
}
