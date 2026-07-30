import { defineEventHandler, readValidatedBody, getRequestHeaders } from 'h3'
import { defineCachedFunction } from 'nitropack/runtime'
import { hash } from 'ohash'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { createStorefrontConfig } from '../../../utils/clients/storefront'
import { withApiVersion } from '../../../utils/clients/transport'
import { forwardableCookie, forwardTrackingHeaders } from '../../utils/tracking'

const API_VERSION_PATTERN = /^(?:unstable|2\d{3}-\d{2})$/

const FORWARDED_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'origin',
  'referer',
  'user-agent',
  'x-shopify-storefront-access-token',
  'shopify-storefront-private-token',
  'x-shopify-uniquetoken',
  'x-shopify-visittoken',
  'shopify-storefront-y',
  'shopify-storefront-s',
  'x-sdk-variant',
  'x-sdk-version',
]

function createUpstreamHeaders(headers: Record<string, string>): Record<string, string> {
  const upstream: Record<string, string> = {}

  for (const [name, value] of Object.entries(headers)) {
    if (value && FORWARDED_HEADERS.includes(name.toLowerCase())) {
      upstream[name] = value
    }
  }

  const cookie = forwardableCookie(headers.cookie ?? '')

  if (cookie) upstream.cookie = cookie

  return upstream
}

export default defineEventHandler(async (event) => {
  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  const requestHeaders = getRequestHeaders(event) as Record<string, string>

  const headers = createUpstreamHeaders(requestHeaders)

  const { _shopify } = useRuntimeConfig()

  const { apiUrl } = createStorefrontConfig(_shopify)

  const requestedApiVersion = requestHeaders['x-shopify-proxy-api-version']

  const apiVersion = requestedApiVersion && API_VERSION_PATTERN.test(requestedApiVersion)
    ? requestedApiVersion
    : undefined

  const url = apiVersion ? withApiVersion(apiUrl, apiVersion) : apiUrl

  const storefrontConfig = _shopify?.clients.storefront
  const cacheConfig = storefrontConfig?.cache ? storefrontConfig.cache : undefined
  const cacheOption = requestHeaders['x-shopify-proxy-cache'] ?? 'none'

  const requestCacheConfig = cacheConfig?.options
    ? cacheOption in cacheConfig.options
      ? cacheConfig.options[cacheOption]
      : undefined
    : undefined

  const cacheBase = typeof cacheConfig?.proxy === 'string'
    ? cacheConfig.proxy
    : typeof cacheConfig?.proxy === 'object'
      ? 'storefront-proxy'
      : undefined

  const cachedProxyRequest = defineCachedFunction(async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE',
    headers: Record<string, string>,
    body: Record<string, unknown> | string,
  ) => {
    const response = await $fetch.raw<object>(url, { method, headers, body })

    forwardTrackingHeaders(event, response.headers)

    return response._data
  }, {
    name: 'storefront-proxy',

    shouldBypassCache: () => !requestCacheConfig,
    getKey: (url, method, _headers, body) => hash({ url, method, cache: cacheOption, body }),

    ...(cacheBase ? { base: cacheBase } : {}),
    ...requestCacheConfig,
  })

  if (requestCacheConfig) {
    return await cachedProxyRequest(url, event.method, headers, body)
  }

  const response = await $fetch.raw<object>(url, {
    method: event.method,
    headers,
    body,
  })

  forwardTrackingHeaders(event, response.headers)

  return response._data
})
