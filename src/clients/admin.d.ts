/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ShopifyApiClient } from '../module'

export interface AdminQueries {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

export interface AdminMutations {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

export interface AdminOperations extends AdminQueries, AdminMutations {}

export type AdminApiClient = ShopifyApiClient<AdminOperations>
