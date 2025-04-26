import type { ClientResponse } from '@shopify/graphql-client'

/**
 * @todo needs to be refactored
 *
 * Extracts the data from the response or throws an error if there is an error.
 *
 * @param response - The response from the Shopify GraphQL API.
 * @returns The data from the response or null if there is an error.
 */
export function extract<T>(response: ClientResponse<T> | null) {
    if (response?.errors?.graphQLErrors) {
        console.log('GraphQL Errors:', response.errors.graphQLErrors)
        throw new Error('GraphQL Error', {
            cause: response.errors.graphQLErrors,
        })
    }
    else if (response?.errors) {
        console.log('Other Errors:', response.errors)
        throw new Error('Unknown Error', {
            cause: response.errors,
        })
    }

    return response?.data ?? null
}
