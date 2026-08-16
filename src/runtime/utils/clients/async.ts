import type { MaybeRefOrGetter } from 'vue'

import { hash } from 'ohash'

export interface AsyncDataArguments<Operation, Options> {
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
    return isOperation(args[1])
      ? { key: asKey(args[0]), operation: asOperation(args[1]) }
      : { operation: asOperation(args[0]), autoKey: args[1] as string }
  }

  return { operation: asOperation(args[0]) }
}

export function createAsyncDataKey(autoKey: string | undefined, operation: unknown, variables: unknown): string {
  return hash([autoKey, operation, variables])
}
