import type { HTTPMethod } from 'h3'
import type { CacheOptions } from 'nitropack'

import type { ShopifyConfig } from '../../../../module'

import { defineEventHandler, readValidatedBody, getRequestHeaders } from 'h3'
import { defineCachedFunction } from 'nitropack/runtime'
import { hash } from 'ohash'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { assertSameSite } from '../../utils/csrf'
import { createStorefrontConfig } from '../../../utils/clients/storefront'
import { API_VERSION_PATTERN } from '../../../utils/clients/defaults'
import {
  PRIVATE_TOKEN_HEADER,
  PROXY_API_VERSION_HEADER,
  PROXY_CACHE_HEADER,
  PUBLIC_TOKEN_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VERSION_HEADER,
  withApiVersion,
} from '../../../utils/clients/transport'
import {
  LEGACY_UNIQUE_TOKEN_HEADER,
  LEGACY_VISIT_TOKEN_HEADER,
  UNIQUE_TOKEN_HEADER,
  VISIT_TOKEN_HEADER,
  forwardableCookie,
  forwardTrackingHeaders,
} from '../../utils/tracking'

const FORWARDED_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'origin',
  'referer',
  'user-agent',
  PUBLIC_TOKEN_HEADER,
  PRIVATE_TOKEN_HEADER,
  UNIQUE_TOKEN_HEADER,
  VISIT_TOKEN_HEADER,
  LEGACY_UNIQUE_TOKEN_HEADER,
  LEGACY_VISIT_TOKEN_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VERSION_HEADER,
].map(header => header.toLowerCase())

const CREDENTIAL_HEADERS = [
  PUBLIC_TOKEN_HEADER,
  PRIVATE_TOKEN_HEADER,
].map(header => header.toLowerCase())

type ProxyCacheConfig = NonNullable<Exclude<NonNullable<ShopifyConfig['clients']['storefront']>['cache'], false>>

type ResolvedCachePreset = {
  name: string
  options: Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>
}

type ProxyRequest = {
  url: string
  method: HTTPMethod
  headers: Record<string, string>
  body: Record<string, unknown>
  cache: string
  credentials: string[]
}

type CollectHeaders = (headers: Headers) => void

type CachedRequest = (request: ProxyRequest, collect: CollectHeaders) => Promise<object | undefined>

function resolveCachePreset(cacheConfig: ProxyCacheConfig | undefined, requested: string): ResolvedCachePreset | undefined {
  const options = cacheConfig?.presets && Object.hasOwn(cacheConfig.presets, requested)
    ? cacheConfig.presets[requested]
    : undefined

  return options ? { name: requested, options } : undefined
}

const cachedRequests = new Map<string, CachedRequest>()

function useCachedRequest(base: string | undefined, preset: ResolvedCachePreset): CachedRequest {
  const id = `${base ?? ''}:${preset.name}`

  let cached = cachedRequests.get(id)

  if (!cached) {
    cached = defineCachedFunction(async (request: ProxyRequest, collect: CollectHeaders) => {
      const response = await $fetch.raw<object>(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })

      collect(response.headers)

      return response._data
    }, {
      name: 'storefront-proxy',

      getKey: (request: ProxyRequest) => hash({
        url: request.url,
        method: request.method,
        body: request.body,
        cache: request.cache,
        credentials: request.credentials,
      }),

      ...(base ? { base } : {}),
      ...preset.options,
    })

    cachedRequests.set(id, cached)
  }

  return cached
}

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
  assertSameSite(event)

  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  const requestHeaders = getRequestHeaders(event) as Record<string, string>

  const headers = createUpstreamHeaders(requestHeaders)

  const { _shopify } = useRuntimeConfig(event)

  const { apiUrl } = createStorefrontConfig(_shopify)

  const requestedApiVersion = requestHeaders[PROXY_API_VERSION_HEADER.toLowerCase()]

  const apiVersion = requestedApiVersion && API_VERSION_PATTERN.test(requestedApiVersion)
    ? requestedApiVersion
    : undefined

  const url = apiVersion ? withApiVersion(apiUrl, apiVersion) : apiUrl

  const storefrontConfig = _shopify?.clients.storefront
  const cacheConfig = storefrontConfig?.cache && storefrontConfig.cache.proxy ? storefrontConfig.cache : undefined
  const cacheOption = requestHeaders[PROXY_CACHE_HEADER.toLowerCase()] ?? 'none'

  const preset = resolveCachePreset(cacheConfig, cacheOption)

  const cacheBase = typeof cacheConfig?.proxy === 'string'
    ? cacheConfig.proxy
    : typeof cacheConfig?.proxy === 'object'
      ? 'storefront-proxy'
      : undefined

  if (preset) {
    let upstreamHeaders: Headers | undefined

    const data = await useCachedRequest(cacheBase, preset)({
      url,
      method: event.method,
      headers,
      body,
      cache: preset.name,
      credentials: CREDENTIAL_HEADERS.map(header => headers[header] ?? ''),
    }, (responseHeaders) => {
      upstreamHeaders = responseHeaders
    })

    if (upstreamHeaders) forwardTrackingHeaders(event, upstreamHeaders)

    return data
  }

  const response = await $fetch.raw<object>(url, {
    method: event.method,
    headers,
    body,
  })

  forwardTrackingHeaders(event, response.headers)

  return response._data
})
