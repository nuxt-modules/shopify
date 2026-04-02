/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ShopifyApiClient } from '../module'

export interface CustomerAccountQueries {
  [key: string]: {
    variables: any
    return: any
  }
  [key: number | symbol]: never
}

export interface CustomerAccountMutations {
  [key: string]: {
    variables: any
    return: any
  }
  [key: number | symbol]: never
}

export interface CustomerAccountOperations extends CustomerAccountQueries, CustomerAccountMutations {}

export type CustomerAccountApiClient = ShopifyApiClient<CustomerAccountOperations>
