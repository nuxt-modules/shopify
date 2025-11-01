/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    ApiClient,
    ApiClientRequestStream,
    ApiClientConfig,
    AllOperations,
} from '@shopify/graphql-client'

type ShopifyApiClient<Operations extends AllOperations> = ApiClient<ApiClientConfig, Operations> & {
    requestStream: ApiClientRequestStream<Operations>
}

interface AdminQueries {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

interface AdminMutations {
    [key: string]: {
        variables: any
        return: any
    }
    [key: number | symbol]: never
}

interface AdminOperations extends AdminQueries, AdminMutations {}

export type AdminApiClient = ShopifyApiClient<AdminOperations>
