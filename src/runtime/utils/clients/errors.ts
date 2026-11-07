import type { AllOperations, ResponseErrors } from '@shopify/graphql-client'
import type { ConsolaOptions } from 'consola'

import type { ShopifyClientCallbacks } from '../../../module'

import { createConsola } from 'consola'
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

export function resolveStatus(upstreamStatus?: number): number {
  return upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 502
}

export function createUpstreamError(status: number, detail: string, cause: unknown, logger?: Partial<ConsolaOptions>) {
  if (!import.meta.client) createConsola(logger).withTag('shopify').error(detail)

  return createError({ status, statusText: statusTexts[status] ?? 'Internal Server Error', message: '[shopify] Request to Shopify failed', cause })
}

export async function handleErrors(
  errors: ResponseErrors,
  shouldThrow: boolean,
  onErrors?: ShopifyClientCallbacks<AllOperations, undefined>['onErrors'],
  logger?: Partial<ConsolaOptions>,
) {
  if (errors) {
    await onErrors?.({ errors })
  }

  if (shouldThrow && errors?.graphQLErrors?.length) {
    throw createUpstreamError(
      resolveStatus(errors.networkStatusCode),
      errors.graphQLErrors.map(error => `GraphQL error: ${error.message}${error.path?.length ? ` (at \`${error.path.join('.')}\`)` : ''}`).join(', '),
      errors,
      logger,
    )
  }

  if (shouldThrow && errors?.message) {
    const { networkStatusCode, message, response } = errors
    const body = response && !response.bodyUsed ? await response.clone().text().catch(() => '') : ''

    throw createUpstreamError(
      resolveStatus(networkStatusCode),
      `Request failed${networkStatusCode ? ` with status ${networkStatusCode}` : ''}: ${message}${body ? ` - ${body}` : ''}`,
      errors,
      logger,
    )
  }
}
