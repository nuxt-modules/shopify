/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResponseErrors } from '@shopify/graphql-client'

import { createError } from '#imports'

function resolveStatusCode(networkStatusCode?: number): number {
  return networkStatusCode && networkStatusCode >= 400 ? networkStatusCode : 500
}

export default function useErrors(
  hooks: any,
  hookKey: string,
  errors: ResponseErrors,
  shouldThrow: boolean,
) {
  const tag = '[shopify]'

  if (errors) {
    hooks.callHook(hookKey, { errors })
  }

  if (shouldThrow && errors?.graphQLErrors?.length) {
    throw createError({
      statusCode: resolveStatusCode(errors.networkStatusCode),
      statusMessage: errors.graphQLErrors.map(error =>
        `${tag} GraphQL error: ${error.message}${error.path?.length ? ` (at \`${error.path.join('.')}\`)` : ''}`,
      ).join(', '),
    })
  }

  if (shouldThrow && errors?.message) {
    throw createError({
      statusCode: resolveStatusCode(errors.networkStatusCode),
      statusMessage: `${tag} Request failed: ${errors.message}`,
    })
  }
}
