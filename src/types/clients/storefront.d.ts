/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GenericApiClient } from '../client'

declare module '#shopify/clients/storefront' {
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

    type StorefrontOperations = StorefrontQueries & StorefrontMutations

    type StorefrontApiClient = GenericApiClient<StorefrontOperations>

    export {
        StorefrontQueries,
        StorefrontMutations,
        StorefrontOperations,
        StorefrontApiClient,
    }
}
