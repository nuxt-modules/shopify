import type { ClientResponse } from '@shopify/graphql-client'

import { normalizeOperation } from './graphql/normalize'
import { scanDefinitions } from './graphql/scanner'

export const DEVTOOLS_CHANNEL = 'nuxt-shopify:devtools'

export const DEVTOOLS_EVENT = 'shopify:devtools:request'

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
  time: number
}

type ResponseHookParams = {
  operation: PropertyKey
  options?: Record<string, unknown>
  response: ClientResponse
  duration?: number
}

let channel: BroadcastChannel | undefined

export function toDevtoolsRequest(client: ShopifyDevtoolsRequest['client'], source: ShopifyDevtoolsRequest['source'], { operation, options, response, duration }: ResponseHookParams, page?: string): ShopifyDevtoolsRequest {
  const query = normalizeOperation(String(operation))

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
    time: Date.now(),
  }
}

export function postRequest(client: ShopifyDevtoolsRequest['client'], source: 'ssr' | 'server', params: ResponseHookParams, page?: string) {
  channel ??= new BroadcastChannel(DEVTOOLS_CHANNEL)

  channel.postMessage(toDevtoolsRequest(client, source, params, page))
}
