import type { AllOperations, ApiClientRequestOptions, StorefrontOperations, ReturnData } from '@shopify/storefront-api-client'
import type { MaybeRefOrGetter } from 'vue'

import type { AsyncDataOptions, AsyncData, NuxtError } from 'nuxt/app'

import { useAsyncData } from 'nuxt/app'

import { useStorefront } from './useStorefront'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type ResT<Operation extends keyof AllOperations> = ReturnData<Operation, StorefrontOperations>

export function useAsyncStorefront<
    Operation extends keyof AllOperations = '',
    Options extends ApiClientRequestOptions<Operation> | undefined = undefined,
    NuxtErrorDataT = unknown,
    DataT = ResT<Operation>,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = DataT,
>(
    key: MaybeRefOrGetter<string>,
    operation: Operation,
    options: Options,
    asyncDataOptions?: AsyncDataOptions<ResT<Operation>, DataT, PickKeys, DefaultT>,
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined> {
    return useAsyncData(
        key,
        () => useStorefront().request(operation, options).then(r => r.data!),
        asyncDataOptions,
    )
}
