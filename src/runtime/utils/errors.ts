/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResponseErrors } from '@shopify/graphql-client'

import { createError } from '#imports'

const statusTexts: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

function resolveStatus(networkStatusCode?: number): number {
  return networkStatusCode && networkStatusCode >= 400 ? networkStatusCode : 500
}

function resolveStatusText(status: number): string {
  return statusTexts[status] ?? 'Internal Server Error'
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
    const statusCode = resolveStatus(errors.networkStatusCode)

    throw createError({
      statusCode,
      statusText: resolveStatusText(statusCode),
      message: errors.graphQLErrors.map(error =>
        `${tag} GraphQL error: ${error.message}${error.path?.length ? ` (at \`${error.path.join('.')}\`)` : ''}`,
      ).join(', '),
    })
  }

  if (shouldThrow && errors?.message) {
    const statusCode = resolveStatus(errors.networkStatusCode)

    throw createError({
      statusCode,
      statusText: resolveStatusText(statusCode),
      message: `${tag} Request failed: ${errors.message}`,
    })
  }
}
