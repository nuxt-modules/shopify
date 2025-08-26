import type { AllOperations, ApiClientRequestOptions, StorefrontOperations, ReturnData } from '@shopify/storefront-api-client'

import type { MaybeRefOrGetter } from '#imports'
import type { AsyncDataOptions } from '#app'

import { useAsyncData } from '#imports'
import { useStorefront } from './useStorefront'

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
) {
    return useAsyncData<ResT<Operation>, NuxtErrorDataT, DataT, PickKeys, DefaultT>(
        key,
        () => useStorefront().request(operation, options).then(r => r.data!),
        asyncDataOptions,
    )
}
