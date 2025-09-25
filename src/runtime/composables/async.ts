/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations, ApiClientRequestOptions, ReturnData } from '@shopify/graphql-client'
import type { MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'

import { unref } from 'vue'

import { useAsyncData } from '#app'

import { useStorefront } from './storefront'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type ResT<Operation extends keyof AllOperations> = ReturnData<Operation, StorefrontOperations>

export type AsyncRequestOptions<
    Operation extends keyof AllOperations,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
> = AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT> & Omit<ApiClientRequestOptions<Operation, StorefrontOperations>, 'variables' | 'headers'> & {
    variables?: ApiClientRequestOptions<Operation, StorefrontOperations>['variables']
    headers?: ApiClientRequestOptions<Operation, StorefrontOperations>['headers']
}

const getRequestOptions = <
    Operation extends keyof AllOperations,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(options?: AsyncRequestOptions<Operation, DataT, PickKeys, DefaultT>) => {
    const { variables, headers, apiVersion, retries, signal } = options ?? {}
    return {
        variables: unref(variables),
        headers: unref(headers),
        apiVersion,
        retries,
        signal,
    } as unknown as ApiClientRequestOptions<Operation, StorefrontOperations>
}

const getAsyncDataOptions = <
    Operation extends keyof AllOperations,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(options?: AsyncRequestOptions<Operation, DataT, PickKeys, DefaultT>) => {
    const { apiVersion, headers, retries, signal, variables, ...asyncDataOptions } = options ?? {}
    return asyncDataOptions as AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>
}

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    operation: Operation,
    options?: AsyncRequestOptions<Operation, DataT, PickKeys, DefaultT>,
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
    options?: AsyncRequestOptions<Operation, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    ...args: any[]
) {
    if (args.length < 1 || args.length > 3) {
        throw new Error('[shopify] [useAsyncStorefront] Invalid number of arguments')
    }

    const key = typeof args[1] === 'string' ? args[0] as MaybeRefOrGetter<string> : undefined
    const operation = (key ? args[1] : args[0]) as Operation
    const options = (key ? args[2] : args[1]) as AsyncRequestOptions<Operation, DataT, PickKeys, DefaultT> | undefined

    const requestOptions = getRequestOptions<Operation, DataT, PickKeys, DefaultT>(options)
    const asyncOptions = getAsyncDataOptions<Operation, DataT, PickKeys, DefaultT>(options)

    const handler = () => useStorefront().request(operation, requestOptions).then(r => r.data!)

    return key
        ? useAsyncData(key, handler, asyncOptions)
        : useAsyncData(handler, asyncOptions)
}
