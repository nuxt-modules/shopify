import type {
    ApiClient,
    ApiClientConfig,
    AllOperations,
    ClientResponse,
    FetchResponseBody,
    ReturnData,
    ResponseWithType,
    ApiClientRequestOptions,
} from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'

export type ShopifyApiClientRequestOptions<Operation extends keyof Operations, Operations extends AllOperations> = ApiClientRequestOptions<Operation, Operations> & {
    cache?: boolean
}

export type ShopifyApiClientRequestParams<Operation extends keyof Operations, Operations extends AllOperations> = [
    operation: Operation,
    options?: ShopifyApiClientRequestOptions<Operation, Operations>,
]

export type ShopifyApiClientConfig = ApiClientConfig & {
    logger?: Partial<ConsolaOptions>
}

export type ShopifyApiClientFetch<Operations extends AllOperations = AllOperations> = <Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations>) => Promise<ResponseWithType<FetchResponseBody<ReturnData<Operation, Operations>>>>
export type ShopifyApiClientRequest<Operations extends AllOperations = AllOperations> = <TData = undefined, Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations>) => Promise<ClientResponse<TData extends undefined ? ReturnData<Operation, Operations> : TData>>
export type ShopifyApiClientRequestStream<Operations extends AllOperations = AllOperations> = <TData = undefined, Operation extends keyof Operations = string>(...params: ShopifyApiClientRequestParams<Operation, Operations>) => Promise<ClientStreamIterator<TData extends undefined ? ReturnData<Operation, Operations> : TData>>

export type ShopifyApiClient<Operations extends AllOperations> = Omit<ApiClient<ShopifyApiClientConfig, Operations>, 'fetch' | 'request'> & {
    fetch: ShopifyApiClientFetch<Operations>
    request: ShopifyApiClientRequest<Operations>
    requestStream: ShopifyApiClientRequestStream<Operations>
}
