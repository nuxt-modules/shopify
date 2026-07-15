import { getCookie, setCookie, uuid } from './helpers'

const SHOPIFY_Y = '_shopify_y'
const SHOPIFY_S = '_shopify_s'

const LONG_TERM_MS = 1000 * 60 * 60 * 24 * 360
const SHORT_TERM_MS = 1000 * 60 * 30

export function ensureShopifyCookies(domain?: string): void {
  if (typeof document === 'undefined') return

  setCookie(SHOPIFY_Y, getCookie(SHOPIFY_Y) || uuid(), LONG_TERM_MS, domain)
  setCookie(SHOPIFY_S, getCookie(SHOPIFY_S) || uuid(), SHORT_TERM_MS, domain)
}
