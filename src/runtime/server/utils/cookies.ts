import type { H3Event } from 'h3'

import { parse } from 'cookie-es'
import { appendResponseHeader } from 'h3'

const SHOPIFY_COOKIE = /^(?:_shopify_\w+|_tracking_consent|cart)$/

const SHOPIFY_SESSION_COOKIES = ['_shopify_analytics', '_shopify_marketing', '_shopify_essential']

export function pickShopifyCookies(header: string | null | undefined): string | undefined {
  const cookies = Object.entries(parse(header ?? '', { decode: value => value }))
    .filter(([name]) => SHOPIFY_COOKIE.test(name))
    .map(([name, value]) => `${name}=${value}`)

  return cookies.length ? cookies.join('; ') : undefined
}

export function forwardShopifySessionCookies(event: H3Event, headers: Headers): void {
  for (const cookie of headers.getSetCookie()) {
    if (SHOPIFY_SESSION_COOKIES.some(name => cookie.startsWith(`${name}=`))) appendResponseHeader(event, 'set-cookie', cookie)
  }
}
