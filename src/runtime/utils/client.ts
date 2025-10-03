import type {
    ApiClientConfig,
    ApiClientRequestOptions,
    AllOperations,
    RequestParams,
} from '@shopify/graphql-client'

import type { GenericApiClient, GenericApiClientConfig } from '../../types'

import { createGraphQLClient } from '@shopify/graphql-client'
import { joinURL } from 'ufo'
import { createConsola } from 'consola'

import { version } from '../../../package.json'

export const createStoreDomain = (name: string) => `https://${name}.myshopify.com`

export const createApiUrl = (storeDomain: string, apiVersion: string, apiPrefix?: string) => joinURL(
    storeDomain,
    apiPrefix ? `${apiPrefix}/api` : 'api',
    apiVersion,
    'graphql.json',
)

export const createClient = <Operations extends AllOperations>(
    config: GenericApiClientConfig,
): GenericApiClient<Operations> => {
    const {
        storeDomain,
        apiUrl,
        apiVersion,
        headers,
        logger,
        retries,
    } = config

    if (!apiVersion) {
        throw new Error('Missing API version')
    }

    const getStoreUrl = (apiVersion: string) => joinURL(
        storeDomain,
        'api',
        apiVersion,
        'graphql.json',
    )

    const clientConfig = {
        storeDomain,
        apiUrl,
        apiVersion: apiVersion,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-SDK-Variant': 'nuxt-shopify',
            'X-SDK-Version': version,
            ...headers,
        },
    } satisfies ApiClientConfig

    const graphqlClient = createGraphQLClient({
        url: apiUrl,
        headers: clientConfig.headers,
        retries,
        logger: logger ? createConsola(logger).withTag('shopify').trace : undefined,
    })

    const getHeaders: GenericApiClient<Operations>['getHeaders'] = customHeaders =>
        ({ ...(customHeaders ?? {}), ...headers })

    const getApiUrl: GenericApiClient<Operations>['getApiUrl'] = (propApiVersion?: string) =>
        propApiVersion ? getStoreUrl(propApiVersion) : apiUrl

    const getGQLClientParams = <
        Operations extends AllOperations = AllOperations,
        Operation extends keyof Operations = string,
    >(
        operation: Operation,
        options?: ApiClientRequestOptions<Operation, Operations>,
    ): RequestParams => {
        const props: RequestParams = [operation as string]

        if (options && Object.keys(options).length > 0) {
            const {
                variables,
                apiVersion,
                headers,
                retries,
                signal,
            } = options

            props.push({
                ...(variables ? { variables } : {}),
                ...(apiVersion ? { url: getApiUrl(apiVersion) } : {}),
                ...(headers ? { headers: getHeaders(headers) } : {}),
                ...(retries ? { retries } : {}),
                ...(signal ? { signal } : {}),
            })
        }

        return props
    }

    return {
        config: clientConfig,
        getHeaders,
        getApiUrl,
        fetch: (...props) => graphqlClient.fetch(...getGQLClientParams(...props)),
        request: (...props) => graphqlClient.request(...getGQLClientParams(...props)),
        requestStream: (...props) => graphqlClient.requestStream(...getGQLClientParams(...props)),
    } as GenericApiClient<Operations>
}
