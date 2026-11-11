import type { H3Event } from 'h3'

import { getRequestHeaders, getRequestURL, toWebRequest } from 'h3'

import { useRuntimeConfig } from '#imports'
import { PUBLIC_TOKEN_HEADER } from '../../utils/clients/transport'
import { pickShopifyCookies } from '../../utils/cookies'
import { CUSTOMER_ACCOUNT_ROUTES } from '../../utils/session'

const SHOPIFY_API_PROXY = /^\/__shopify(?:\/|$)/

const AJAX_CART_ENDPOINT = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i

const SHOPIFY_ENDPOINTS = [
  /^\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json$/,
  /^\/__shopify\/api\/collect$/,
  AJAX_CART_ENDPOINT,
  /^\/checkout$/,
  /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/,
  /^\/buy\/(?:[\w.-]+|~[\w-]+):[1-9]\d*(?:,(?:[\w.-]+|~[\w-]+):[1-9]\d*)*$/,
  /^\/\.well-known\/(?:ucp|apple-developer-merchantid-domain-association|shopify\/fec\/produce)$/,
  /^\/api\/(?:ucp\/)?mcp$/,
  /^\/api\/predictive-search$/,
]

const CART_PATH = '/api/cart'

const UCP_MCP_PATH = '/api/ucp/mcp'

const CREDENTIAL_HEADERS = [
  'x-forwarded-client-cert',
  'x-forwarded-access-token',
]

const PLATFORM_HEADER_PREFIXES = [
  'x-vercel-',
  'x-nf-',
  'cf-access-',
  'x-amzn-oidc-',
  'x-ms-client-principal',
  'x-ms-token-',
  'x-goog-iap-',
  'x-goog-authenticated-user-',
  'x-auth-request-',
  'x-pomerium-',
]

export function isCustomerAccountEndpoint(pathname: string): boolean {
  return CUSTOMER_ACCOUNT_ROUTES.includes(pathname)
}

export function isCartEndpoint(pathname: string): boolean {
  return pathname === CART_PATH
}

export function isAjaxCartEndpoint(pathname: string): boolean {
  return AJAX_CART_ENDPOINT.test(pathname)
}

export function isShopifyApiProxyPath(pathname: string): boolean {
  return SHOPIFY_API_PROXY.test(pathname)
}

export function isShopifyEndpoint(pathname: string, routes: Record<'storefront' | 'customerAccount', boolean>): boolean {
  return (routes.storefront && (isCartEndpoint(pathname) || SHOPIFY_ENDPOINTS.some(endpoint => endpoint.test(pathname))))
    || (routes.customerAccount && isCustomerAccountEndpoint(pathname))
}

function isPrivateHeader(name: string, pathname: string): boolean {
  if (name === 'authorization') return pathname !== UCP_MCP_PATH

  return CREDENTIAL_HEADERS.includes(name) || PLATFORM_HEADER_PREFIXES.some(prefix => name.startsWith(prefix))
}

export function getPublicRequestURL(event: H3Event): URL {
  const url = getRequestURL(event)
  const origin = useRuntimeConfig(event)._shopify?.origin

  return origin ? new URL(`${new URL(origin).origin}${url.pathname}${url.search}`) : url
}

export function toShopifyHeaders(event: H3Event, pathname: string, publicAccessToken?: string): Headers {
  const headers = new Headers()

  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value !== undefined && !isPrivateHeader(name, pathname)) headers.set(name, value)
  }

  const cookie = pickShopifyCookies(headers.get('cookie'))

  if (cookie) headers.set('cookie', cookie)
  else headers.delete('cookie')

  if (publicAccessToken && !headers.has(PUBLIC_TOKEN_HEADER)) headers.set(PUBLIC_TOKEN_HEADER, publicAccessToken)

  return headers
}

export function toShopifyRequest(event: H3Event, publicAccessToken?: string): Request {
  const request = toWebRequest(event)
  const url = getPublicRequestURL(event)

  return new Request(url, {
    method: request.method,
    headers: toShopifyHeaders(event, url.pathname, publicAccessToken),
    body: request.body,
    signal: request.signal,
    duplex: 'half',
  } as RequestInit)
}
