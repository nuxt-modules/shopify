import type { ShopifyRouteHandlerContext } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import { getRequestURL, toWebRequest } from 'h3'

import { PUBLIC_TOKEN_HEADER } from '../../utils/clients/transport'
import { pickShopifyCookies } from './cookies'

const SHOPIFY_ENDPOINTS = [
  /^\/api\/(?:unstable|\d{4}-\d{2})\/graphql\.json$/,
  /^\/__shopify(?:\/|$)/,
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\/(?:add|update|change|clear))?\.(?:js|json)$/i,
  /^\/\.well-known\/(?:ucp|apple-developer-merchantid-domain-association|shopify\/fec\/produce)$/,
  /^\/api\/(?:ucp\/)?mcp$/,
]

export function isShopifyEndpoint(pathname: string): boolean {
  return SHOPIFY_ENDPOINTS.some(endpoint => endpoint.test(pathname))
}

export function toShopifyRequest(event: H3Event, publicAccessToken?: string): Request {
  const request = toWebRequest(event)
  const headers = new Headers(request.headers)
  const cookie = pickShopifyCookies(headers.get('cookie'))

  if (cookie) headers.set('cookie', cookie)
  else headers.delete('cookie')

  if (publicAccessToken && !headers.has(PUBLIC_TOKEN_HEADER)) headers.set(PUBLIC_TOKEN_HEADER, publicAccessToken)

  return new Request(request, { headers })
}

export function createRequestSessionManager(event: H3Event): ShopifyRouteHandlerContext['sessionManager'] {
  const items = new Map<string, unknown>()

  return {
    getSessionOrigin: () => getRequestURL(event).origin,
    getSessionItem: key => items.get(key),
    setSessionItem: (key, value) => void items.set(key, value),
    removeSessionItem: key => void items.delete(key),
  }
}
