import type { ClientResponse } from '@shopify/graphql-client'
import type { AnalyticsEventName } from '@shopify/hydrogen'

import { BROWSER_CACHE_NAME } from './clients/cache'
import { normalizeOperation } from './graphql/normalize'
import { scanDefinitions } from './graphql/scanner'

export const DEVTOOLS_CHANNEL = 'nuxt-shopify:devtools'

export const DEVTOOLS_EVENT = 'shopify:devtools:request'

export const DEVTOOLS_ANALYTICS_EVENT = 'shopify:devtools:analytics'

export const DEVTOOLS_CONSENT_EVENT = 'shopify:devtools:consent'

export type ShopifyDevtoolsRequest = {
  client: 'storefront' | 'customer-account' | 'admin'
  source: 'ssr' | 'server' | 'browser'
  page?: string
  operation: string
  query: string
  variables?: Record<string, unknown>
  data?: ClientResponse['data']
  errors?: Omit<NonNullable<ClientResponse['errors']>, 'response'>
  extensions?: ClientResponse['extensions']
  duration?: number
  cache?: 'hit' | 'miss' | 'bypass' | 'browser'
  requestId?: string
  apiVersion?: string
  deprecation?: string
  processingTime?: number
  time: number
}

export type ShopifyDevtoolsAnalyticsEvent = {
  event: AnalyticsEventName
  page?: string
  payload: object
  time: number
}

export type ShopifyDevtoolsConsent = {
  loaded: boolean
  analytics?: boolean
  marketing?: boolean
  preferences?: boolean
  saleOfData?: boolean
}

type ResponseHookParams = {
  operation: PropertyKey
  options?: Record<string, unknown>
  response: ClientResponse
  duration?: number
}

let channel: BroadcastChannel | undefined

function splitHeaderList(value: string | null | undefined) {
  return value?.split(',').map(member => member.split(';').map(part => part.trim())) ?? []
}

function readCacheStatus(headers: Headers | undefined): ShopifyDevtoolsRequest['cache'] {
  const caches = splitHeaderList(headers?.get('cache-status'))
  const hydrogen = caches.find(([name]) => name === 'Hydrogen')

  if (caches.some(([name]) => name === BROWSER_CACHE_NAME)) return 'browser'
  if (!hydrogen) return undefined

  return hydrogen.includes('hit') ? 'hit' : hydrogen.some(parameter => parameter.startsWith('fwd=bypass')) ? 'bypass' : 'miss'
}

export function toDevtoolsRequest(client: ShopifyDevtoolsRequest['client'], source: ShopifyDevtoolsRequest['source'], { operation, options, response, duration }: ResponseHookParams, page?: string): ShopifyDevtoolsRequest {
  const query = normalizeOperation(String(operation))
  const headers = response.headers ?? response.errors?.response?.headers
  const processingTime = splitHeaderList(headers?.get('server-timing')).find(([name]) => name === 'processing')?.find(parameter => parameter.startsWith('dur='))

  return {
    client,
    source,
    page,
    operation: scanDefinitions(query).find(definition => definition.kind === 'operation')?.name ?? 'Anonymous',
    query,
    variables: options?.variables && JSON.parse(JSON.stringify(options.variables)),
    data: response.data,
    errors: response.errors && {
      message: response.errors.message,
      networkStatusCode: response.errors.networkStatusCode,
      graphQLErrors: response.errors.graphQLErrors,
    },
    extensions: response.extensions,
    duration,
    cache: readCacheStatus(headers),
    requestId: headers?.get('x-request-id') ?? undefined,
    apiVersion: headers?.get('x-shopify-api-version') ?? undefined,
    deprecation: headers?.get('x-shopify-api-deprecated-reason') ?? undefined,
    processingTime: processingTime ? Number(processingTime.slice('dur='.length)) : undefined,
    time: Date.now(),
  }
}

export function postRequest(client: ShopifyDevtoolsRequest['client'], source: 'ssr' | 'server', params: ResponseHookParams, page?: string) {
  channel ??= new BroadcastChannel(DEVTOOLS_CHANNEL)

  channel.postMessage(toDevtoolsRequest(client, source, params, page))
}
