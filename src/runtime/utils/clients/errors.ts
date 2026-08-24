import type { AllOperations, ResponseErrors } from '@shopify/graphql-client'

import type { ShopifyClientCallbacks } from '../../../module'

import { createError } from 'h3'

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

export function resolveStatus(networkStatusCode?: number): number {
  return networkStatusCode && networkStatusCode >= 400 ? networkStatusCode : 500
}

export function resolveStatusText(status: number): string {
  return statusTexts[status] ?? 'Internal Server Error'
}

export default async function useErrors(
  errors: ResponseErrors,
  shouldThrow: boolean,
  onErrors?: ShopifyClientCallbacks<AllOperations, undefined>['onErrors'],
) {
  const tag = '[shopify]'

  if (errors) {
    await onErrors?.({ errors })
  }

  if (shouldThrow && errors?.graphQLErrors?.length) {
    const status = resolveStatus(errors.networkStatusCode)

    throw createError({
      status,
      statusText: resolveStatusText(status),
      message: errors.graphQLErrors.map(error =>
        `${tag} GraphQL error: ${error.message}${error.path?.length ? ` (at \`${error.path.join('.')}\`)` : ''}`,
      ).join(', '),
    })
  }

  if (shouldThrow && errors?.message) {
    const status = resolveStatus(errors.networkStatusCode)

    throw createError({
      status,
      statusText: resolveStatusText(status),
      message: `${tag} Request failed: ${errors.message}`,
    })
  }
}
