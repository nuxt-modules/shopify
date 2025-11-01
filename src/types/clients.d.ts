import type {
    ApiClient,
    ApiClientRequestStream,
    ApiClientConfig,
    AllOperations,
} from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'

export type ShopifyApiClient<Operations extends AllOperations> = ApiClient<ApiClientConfig, Operations> & {
    requestStream: ApiClientRequestStream<Operations>
}

export type ShopifyApiClientConfig = ApiClientConfig & {
    logger?: Partial<ConsolaOptions>
}
