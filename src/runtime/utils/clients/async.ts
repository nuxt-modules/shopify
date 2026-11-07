/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations, OperationVariables } from '@shopify/graphql-client'
import type { MaybeRef, MaybeRefOrGetter } from 'vue'

import type { AsyncData, AsyncDataOptions, NuxtError } from '#app'
import type { ShopifyApiClientRequestOptions } from '../../../module'

import { hash } from 'ohash'

type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T
type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>

type InferDataType<ResT, Options> = Options extends { transform: (data: ResT) => infer R }
  ? R extends Promise<infer T> ? T : R
  : ResT

type InferPickType<ResT, Options> = Options extends { pick: infer P }
  ? P extends KeysOf<ResT> ? PickFrom<ResT, P> : ResT
  : ResT

export type ShopifyAsyncDataOptions<
  Operation extends keyof Operations,
  Operations extends AllOperations,
  ResT,
  Cache extends boolean | undefined = undefined,
> = {
  apiVersion?: ShopifyApiClientRequestOptions<Operation, Operations>['apiVersion']
  retries?: ShopifyApiClientRequestOptions<Operation, Operations>['retries']
  signal?: ShopifyApiClientRequestOptions<Operation, Operations>['signal']
  cache?: MaybeRef<ShopifyApiClientRequestOptions<Operation, Operations, Cache>['cache']>
  headers?: MaybeRef<ShopifyApiClientRequestOptions<Operation, Operations>['headers']>
  variables?: MaybeRef<{ [k in keyof OperationVariables<Operation, Operations>['variables']]: MaybeRef<OperationVariables<Operation, Operations>['variables'][k]> }>
} & Omit<AsyncDataOptions<ResT>, 'transform' | 'pick'> & {
  transform?: (data: ResT) => any
  pick?: KeysOf<ResT>
}

export type ShopifyAsyncData<ResT, Options, NuxtErrorDataT = unknown> = AsyncData<
  (Options extends { transform: any }
    ? InferDataType<ResT, Options>
    : Options extends { pick: any }
      ? InferPickType<ResT, Options>
      : ResT
  ) | null | undefined,
  (NuxtErrorDataT extends Error | NuxtError ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | null | undefined
>

type AsyncDataArguments<Operation, Options> = {
  key?: MaybeRefOrGetter<string>
  operation: Operation
  options?: Options
  autoKey?: string
}

const isOperation = (value: unknown): value is string => typeof value === 'string' && value.includes('{')

export function parseAsyncDataArguments<Operation, Options>(args: unknown[]): AsyncDataArguments<Operation, Options> {
  const asKey = (value: unknown) => value as MaybeRefOrGetter<string>
  const asOperation = (value: unknown) => value as Operation
  const asOptions = (value: unknown) => value as Options | undefined

  if (args.length >= 4) {
    return { key: asKey(args[0]), operation: asOperation(args[1]), options: asOptions(args[2]), autoKey: args[3] as string }
  }

  if (args.length === 3) {
    if (typeof args[2] !== 'string') {
      return { key: asKey(args[0]), operation: asOperation(args[1]), options: asOptions(args[2]) }
    }

    return isOperation(args[1])
      ? { key: asKey(args[0]), operation: asOperation(args[1]), autoKey: args[2] }
      : { operation: asOperation(args[0]), options: asOptions(args[1]), autoKey: args[2] }
  }

  if (args.length === 2) {
    if (isOperation(args[1])) return { key: asKey(args[0]), operation: asOperation(args[1]) }

    return typeof args[1] === 'string'
      ? { operation: asOperation(args[0]), autoKey: args[1] }
      : { operation: asOperation(args[0]), options: asOptions(args[1]) }
  }

  return { operation: asOperation(args[0]) }
}

export function createAsyncDataKey(autoKey: string | undefined, operation: unknown, variables: unknown): string {
  return hash([autoKey, operation, variables])
}
