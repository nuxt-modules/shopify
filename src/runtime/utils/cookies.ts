import { parse } from 'cookie-es'

const SHOPIFY_COOKIE = /^(?:_shopify_\w+|_tracking_consent|cart)$/

export function pickShopifyCookies(header: string | null | undefined): string | undefined {
  const cookies = Object.entries(parse(header ?? '', { decode: value => value }))
    .filter(([name]) => SHOPIFY_COOKIE.test(name))
    .map(([name, value]) => `${name}=${value}`)

  return cookies.length ? cookies.join('; ') : undefined
}
