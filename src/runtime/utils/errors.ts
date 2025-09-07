/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResponseErrors } from '@shopify/graphql-client'
import type { Hookable, HookKeys } from 'hookable'

import { createError } from '#imports'

export default function useErrors<
    HooksT extends Record<string, any> = Record<string, any>,
    HookNameT extends HookKeys<HooksT> = HookKeys<HooksT>,
>(
    hooks: Hookable<HooksT, HookNameT>,
    hookKey: HookNameT,
    errors: ResponseErrors,
    shouldThrow: boolean,
) {
    const tag = '[shopify]'

    if (errors) {
        // @ts-expect-error Hookable types are hard
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
