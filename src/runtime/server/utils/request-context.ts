import type { I18nConfig, ShopifyRequestContext } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../module'

import { createShopifyRequestContext } from '@shopify/hydrogen'
import {
  appendResponseHeader,
  createError,
  getResponseHeaders,
  removeResponseHeader,
  setResponseHeader,
} from 'h3'

import { useRuntimeConfig } from '#imports'
import { resolveBuyerIp } from '../../utils/clients/buyer-ip'
import { getPublicRequestURL, toShopifyHeaders } from './routes'
import { getShopResolver } from './shop'

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
