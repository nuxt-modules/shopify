import { getTrackingValues } from '@shopify/hydrogen-react'

const UNIQUE_TOKEN_MAX_AGE = 3600 * 24 * 360
const VISIT_TOKEN_MAX_AGE = 1800

const UNIQUE_TOKEN_COOKIE = '_shopify_y'
const VISIT_TOKEN_COOKIE = '_shopify_s'

const PLACEHOLDER_TOKEN = '00000000-'

function createToken(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

function writeCookie(name: string, value: string, maxAge: number, domain?: string): void {
  document.cookie = [
    `${name}=${value}`,
    `max-age=${maxAge}`,
    'path=/',
    'samesite=lax',
    ...(domain ? [`domain=${domain}`] : []),
  ].join('; ')
}

export function persistTrackingTokens(domain?: string): void {
  if (typeof document === 'undefined') return

  const { uniqueToken, visitToken } = getTrackingValues()

  if ((uniqueToken || visitToken || '').startsWith(PLACEHOLDER_TOKEN)) return

  writeCookie(UNIQUE_TOKEN_COOKIE, uniqueToken || createToken(), UNIQUE_TOKEN_MAX_AGE, domain)
  writeCookie(VISIT_TOKEN_COOKIE, visitToken || createToken(), VISIT_TOKEN_MAX_AGE, domain)
}

export function clearTrackingTokens(domain?: string): void {
  if (typeof document === 'undefined') return

  writeCookie(UNIQUE_TOKEN_COOKIE, '', 0, domain)
  writeCookie(VISIT_TOKEN_COOKIE, '', 0, domain)
}
