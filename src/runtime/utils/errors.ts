/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResponseErrors } from '@shopify/graphql-client'

import { createError } from '#imports'

export default function useErrors(
    hooks: any,
    hookKey: any,
    errors: ResponseErrors,
    shouldThrow: boolean,
) {
    const tag = '[shopify]'

    if (errors) {
        hooks.callHook(hookKey, { errors })
    }

    if (shouldThrow && errors?.graphQLErrors?.length) {
        throw createError({
            statusCode: errors.networkStatusCode ?? 500,
            statusMessage: errors.graphQLErrors.map(error =>
                `${tag} GraphQL Error: ${error.message}: ${error.path?.join('.')}`,
            ).join(', '),
        })
    }

    if (shouldThrow && errors?.message) {
        throw createError({
            statusCode: errors.networkStatusCode ?? 500,
            statusMessage: `${tag} Error: ${errors.message}`,
        })
    }
}
