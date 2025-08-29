import type {
    ApiClient,
    ApiClientRequestStream,
    ApiClientConfig,
    AllOperations,
} from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'

export type GenericApiClient<Operations extends AllOperations> = ApiClient<ApiClientConfig, Operations> & {
    requestStream: ApiClientRequestStream<Operations>
}

export type GenericApiClientConfig = Omit<ApiClientConfig, 'storeDomain'> & {
    logger?: Partial<ConsolaOptions>
}
