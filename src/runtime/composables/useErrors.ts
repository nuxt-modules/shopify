import type { NuxtApp } from '#app'
import type { ClientResponse } from '@shopify/graphql-client'

import { createError } from '#app'

export default function useErrors(nuxtApp: NuxtApp, errors: ClientResponse['errors'], shouldThrow: boolean) {
    const tag = '[shopify]'

    if (errors) {
        nuxtApp.hooks.callHook('storefront:client:errors', { errors })
    }

    if (shouldThrow && errors?.graphQLErrors?.length) {
        throw createError({
            statusCode: errors.networkStatusCode ?? 500,
            statusMessage: errors.graphQLErrors.map(error => `${tag} GraphQL Error: ${error.message}: ${error.path?.join('.')}`).join(', '),
        })
    }

    if (shouldThrow && errors?.message) {
        throw createError({
            statusCode: errors.networkStatusCode ?? 500,
            statusMessage: `${tag} Error: ${errors.message}`,
        })
    }
}
