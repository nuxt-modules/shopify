/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    ApiClient,
    ApiClientRequestStream,
    ApiClientConfig,
    AllOperations,
} from '@shopify/graphql-client'

declare module '#shopify/clients/storefront' {
    type GenericApiClient<Operations extends AllOperations> = ApiClient<ApiClientConfig, Operations> & {
        requestStream: ApiClientRequestStream<Operations>
    }

    interface StorefrontQueries {
        [key: string]: {
            variables: any
            return: any
        }
        [key: number | symbol]: never
    }

    interface StorefrontMutations {
        [key: string]: {
            variables: any
            return: any
        }
        [key: number | symbol]: never
    }

    interface StorefrontOperations extends StorefrontQueries, StorefrontMutations {}

    export type StorefrontApiClient = GenericApiClient<StorefrontOperations>
}
