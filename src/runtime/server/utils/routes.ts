import type { I18nConfig, ShopifyRequestContext, ShopifyRequestContextWithBuyerIp, StorefrontClient } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import type { ShopifyConfig, ShopifyScriptsShopContext } from '../../../module'

import { createShopifyRequestContext, createStorefrontClient, handleShopifyRedirects } from '@shopify/hydrogen'
import {
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
} from '@shopify/hydrogen/customer-account'
import {
  appendResponseHeader,
  createError,
  getRequestHeaders,
  getRequestURL,
  getResponseHeaders,
  removeResponseHeader,
  setResponseHeader,
  toWebRequest,
} from 'h3'

import { useRuntimeConfig } from '#imports'
import { createShopResolver } from '../../utils/analytics/shop'
import { resolveBuyerIp } from '../../utils/clients/buyer-ip'
import { MOCK_STORE_DOMAIN, createStorefrontApiClient } from '../../utils/clients/storefront'
import { PUBLIC_TOKEN_HEADER, createStoreDomain } from '../../utils/clients/transport'
import { pickShopifyCookies } from '../../utils/cookies'

const SHOPIFY_API_PROXY = /^\/__shopify(?:\/|$)/

const SHOPIFY_ENDPOINTS = [
  /^\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json$/,
  /^\/__shopify\/api\/collect$/,
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i,
  /^\/checkout$/,
  /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/,
  /^\/buy\/(?:[\w.-]+|~[\w-]+):[1-9]\d*(?:,(?:[\w.-]+|~[\w-]+):[1-9]\d*)*$/,
  /^\/\.well-known\/(?:ucp|apple-developer-merchantid-domain-association|shopify\/fec\/produce)$/,
  /^\/api\/(?:ucp\/)?mcp$/,
  /^\/api\/predictive-search$/,
]

const CUSTOMER_ACCOUNT_PATHS: string[] = [
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
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
  return CUSTOMER_ACCOUNT_PATHS.includes(pathname)
}

export function isCartEndpoint(pathname: string): boolean {
  return pathname === CART_PATH
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

function toShopifyHeaders(event: H3Event, pathname: string, publicAccessToken?: string): Headers {
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

let resolveShop: ReturnType<typeof createShopResolver> | undefined

function getShopResolver(config: ShopifyConfig) {
  resolveShop ??= createShopResolver(config, config.clients.storefront ? () => createStorefrontApiClient<true>(config, { throwOnErrors: false }) : undefined)

  return resolveShop
}

export function resolveShopifyScripts(event: H3Event): Promise<ShopifyScriptsShopContext> {
  return getShopResolver(useRuntimeConfig(event)._shopify!)(event.context.shopifyMarket)
}

async function lookUpDefaultMarket(config: ShopifyConfig): Promise<I18nConfig> {
  const market = config.clients.storefront ? (await getShopResolver(config)()).i18n : undefined

  if (!market) {
    throw createError({
      status: 502,
      statusText: 'Bad Gateway',
      message: '[shopify] Failed to look up the shop\'s default market through the storefront client. Set `defaultMarket`, or set the market of each request on `event.context.shopifyMarket` in a Nitro plugin',
    })
  }

  return market
}

export async function resolveShopifyMarket(event: H3Event, config: ShopifyConfig): Promise<I18nConfig> {
  const defaultMarket = config.defaultMarket?.country && config.defaultMarket.language ? config.defaultMarket : undefined

  return event.context.shopifyMarket ?? defaultMarket ?? await lookUpDefaultMarket(config)
}

export async function getShopifyRequestContext(event: H3Event): Promise<ShopifyRequestContext> {
  if (event.context.shopifyRequestContext) return event.context.shopifyRequestContext

  const config = useRuntimeConfig(event)._shopify!
  const storefront = config.clients.storefront

  const i18n = await resolveShopifyMarket(event, config)
  const url = getPublicRequestURL(event)
  const buyerIp = storefront?.privateAccessToken && !storefront.mock ? resolveBuyerIp(event, storefront.buyerIpHeader) : undefined

  const input = {
    request: new Request(url, { method: event.method, headers: toShopifyHeaders(event, url.pathname) }),
    i18n,
  }

  event.context.shopifyRequestContext ??= buyerIp
    ? createShopifyRequestContext({ ...input, buyerIp })
    : createShopifyRequestContext(input)

  return event.context.shopifyRequestContext
}

function hasBuyerIp(requestContext: ShopifyRequestContext): requestContext is ShopifyRequestContextWithBuyerIp {
  return !!requestContext.buyerIp
}

export function createShopifyStorefrontClient(requestContext: ShopifyRequestContext, { name, storefrontId, clients: { storefront } }: ShopifyConfig): StorefrontClient {
  const config = {
    storeDomain: storefront?.mock ? MOCK_STORE_DOMAIN : createStoreDomain(name),
    storefrontId: storefrontId || undefined,
    apiVersion: storefront?.apiVersion,
  }

  const privateStorefrontToken = storefront?.mock ? undefined : storefront?.privateAccessToken

  const client = !privateStorefrontToken
    ? createStorefrontClient({ type: 'public', requestContext, config: { ...config, publicStorefrontToken: storefront?.publicAccessToken || undefined } })
    : hasBuyerIp(requestContext)
      ? createStorefrontClient({ type: 'private', requestContext, config: { ...config, privateStorefrontToken } })
      : createStorefrontClient({ type: 'private_no_buyer_context', requestContext, config: { ...config, privateStorefrontToken } })

  const graphql = (async (...args: Parameters<StorefrontClient['graphql']>) => {
    const result = await client.graphql(...args)
    const headers = new Headers(result.headers)

    headers.delete('set-cookie')

    return { ...result, headers }
  }) as StorefrontClient['graphql']

  return { ...client, graphql }
}

export async function getShopifyRedirect(event: H3Event): Promise<Response | null> {
  const config = useRuntimeConfig(event)._shopify!
  const requestContext = await getShopifyRequestContext(event).catch(() => undefined)

  if (!requestContext) return null

  return handleShopifyRedirects({
    request: toShopifyRequest(event),
    storefrontClient: createShopifyStorefrontClient(requestContext, config),
    routeTemplates: config.routeTemplates,
  })
}

function toHeaders(headers: ReturnType<typeof getResponseHeaders>): Headers {
  const result = new Headers()

  for (const [name, value] of Object.entries(headers)) {
    for (const entry of [value].flat()) {
      if (entry !== undefined) result.append(name, String(entry))
    }
  }

  return result
}

export function applyShopifyResponseHeaders(event: H3Event, response?: Response) {
  const requestContext = event.context.shopifyRequestContext

  if (!requestContext || event.node.res.headersSent) return

  const current = toHeaders(getResponseHeaders(event))
  const applied = new Headers(current)

  requestContext.applyResponseHeaders(applied)

  for (const name of new Set(current.keys())) {
    if (!applied.has(name)) removeResponseHeader(event, name)
  }

  for (const [name, value] of applied) {
    if (name !== 'set-cookie' && current.get(name) !== value) setResponseHeader(event, name, value)
  }

  const cookies = new Set([...current.getSetCookie(), ...response?.headers.getSetCookie() ?? []])

  for (const cookie of applied.getSetCookie()) {
    if (!cookies.has(cookie)) appendResponseHeader(event, 'set-cookie', cookie)
  }
}
