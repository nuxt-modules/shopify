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

interface UpstreamFailure {
  status?: number
  statusCode?: number
  statusText?: string
  data?: unknown
}

interface UpstreamBody {
  errors?: { message?: string, extensions?: { code?: string } }[]
}

function parseBody(data: unknown) {
  if (typeof data !== 'string') return data

  try {
    return JSON.parse(data)
  }
  catch {
    return data
  }
}

function describe(body: unknown) {
  const errors = (body as UpstreamBody)?.errors

  if (!Array.isArray(errors)) return undefined

  const described = errors
    .map(error => error?.message || error?.extensions?.code)
    .filter(Boolean)

  return described.length ? described.join(', ') : undefined
}

export function createUpstreamError(client: string, error: unknown) {
  const { status, statusCode, statusText, data } = (error ?? {}) as UpstreamFailure

  const upstreamStatus = status ?? statusCode
  const resolved = upstreamStatus ? resolveStatus(upstreamStatus) : 502

  const body = parseBody(data)
  const detail = describe(body)

  return createError({
    status: resolved,
    statusText: statusText || resolveStatusText(resolved),
    message: `[shopify] The ${client} API rejected the request with status ${resolved}${detail ? `: ${detail}` : ''}`,
    data: body,
  })
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
