/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations, ApiClientRequestOptions, ReturnData, Headers } from '@shopify/graphql-client'
import type { StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { MaybeRef, MaybeRefOrGetter } from 'vue'
import type { AsyncDataOptions, AsyncData, NuxtError } from '#app'

import { unref } from 'vue'
import { useAsyncData } from '#app'
import { useStorefront } from './storefront'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>
type ResT<Operation extends keyof AllOperations> = ReturnData<Operation, StorefrontOperations>
type InputMaybe<_R = never> = never

type UnpackedInput<InputType> = 'input' extends keyof InputType ? InputType['input'] : InputType
type UnpackedInputMaybe<InputType> = InputType extends InputMaybe<infer R> ? InputMaybe<UnpackedInput<R>> : UnpackedInput<InputType>

export type AsyncRequestOptions<
    Operation extends keyof AllOperations,
    Operations extends AllOperations = AllOperations,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
> = AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT> & {
    apiVersion?: string
    headers?: Headers
    retries?: number
    signal?: AbortSignal
} & (Operation extends keyof Operations ? Operations[Operation]['variables'] extends Record<string, never> ? Record<string, never> : {
    variables?: MaybeRef<{
        [k in keyof Operations[Operation]['variables']]: MaybeRef<UnpackedInputMaybe<Operations[Operation]['variables'][k]>>
    }>
} : {
    variables?: MaybeRef<Record<string, MaybeRef<any>>>
})

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    operation: Operation,
    options?: AsyncRequestOptions<Operation, StorefrontOperations, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    key: MaybeRefOrGetter<string>,
    operation: Operation,
    options?: AsyncRequestOptions<Operation, StorefrontOperations, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
>(
    ...args: any[]
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined> {
    if (args.length < 1 || args.length > 3) {
        throw new Error('[shopify] [useAsyncStorefront] Invalid number of arguments')
    }

    const key = typeof args[1] === 'string' ? args[0] as MaybeRefOrGetter<string> : undefined
    const operation = (key ? args[1] : args[0]) as Operation
    const options = (key ? args[2] : args[1]) as AsyncRequestOptions<Operation, StorefrontOperations, DataT, PickKeys, DefaultT> | undefined

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
    } as ApiClientRequestOptions<Operation, StorefrontOperations>).then(r => r.data!)

    return key
        ? useAsyncData(key, handler, asyncOptions as AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>)
        : useAsyncData(handler, asyncOptions as AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>)
}
