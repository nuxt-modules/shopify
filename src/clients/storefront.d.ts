/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ShopifyApiClient } from '../module'

export interface StorefrontQueries {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

export interface StorefrontMutations {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

export interface StorefrontOperations extends StorefrontQueries, StorefrontMutations {}

export type StorefrontApiClient = ShopifyApiClient<StorefrontOperations>
