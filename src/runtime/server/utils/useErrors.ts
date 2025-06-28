import type { ClientResponse } from '@shopify/graphql-client'
import type { NitroApp } from 'nitropack'

export default function useErrors(nitroApp: NitroApp, errors: ClientResponse['errors'], shouldThrow: boolean) {
    const tag = '[shopify]'

    if (errors) {
        nitroApp.hooks.callHook('storefront:client:errors', { errors })
    }

    if (shouldThrow && errors?.graphQLErrors?.length) {
        throw new Error(errors.graphQLErrors.map(error => `${tag} GraphQL Error: ${error.message}: ${error.path?.join('.')}`).join(', '))
    }

    if (shouldThrow && errors?.message) {
        throw new Error(`${tag} Error ${errors?.networkStatusCode ?? 500}: ${errors.message}`)
    }
}
