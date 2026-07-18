// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { trackingValues } = vi.hoisted(() => ({
  trackingValues: { current: { uniqueToken: '', visitToken: '', consent: '' } },
}))

vi.mock('@shopify/hydrogen-react', () => ({
  getTrackingValues: () => trackingValues.current,
}))

const { clearTrackingTokens, persistTrackingTokens } = await import('../../src/runtime/utils/analytics/cookies')

function readCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`\\b${name}=([^;]*)`))?.[1]
}

beforeEach(() => {
  trackingValues.current = { uniqueToken: '', visitToken: '', consent: '' }

  for (const name of ['_shopify_y', '_shopify_s']) {
    document.cookie = `${name}=; max-age=0; path=/`
  }
})

describe('analytics tracking cookies', () => {
  it('generates visitor tokens when the host strips server timing', () => {
    persistTrackingTokens()

    expect(readCookie('_shopify_y')).toBeTruthy()
    expect(readCookie('_shopify_s')).toBeTruthy()
  })

  it('reuses a token Shopify already issued rather than replacing it', () => {
    trackingValues.current = { uniqueToken: 'shopify-unique', visitToken: 'shopify-visit', consent: '' }

    persistTrackingTokens()

    expect(readCookie('_shopify_y')).toBe('shopify-unique')
    expect(readCookie('_shopify_s')).toBe('shopify-visit')
  })

  it('keeps the visitor token stable across events', () => {
    persistTrackingTokens()
    const unique = readCookie('_shopify_y')

    trackingValues.current = { uniqueToken: unique!, visitToken: '', consent: '' }
    persistTrackingTokens()

    expect(readCookie('_shopify_y')).toBe(unique)
  })

  it('never stores Shopify\'s all-zero placeholder token', () => {
    trackingValues.current = { uniqueToken: '00000000-0000-0000-0000-000000000000', visitToken: '', consent: '' }

    persistTrackingTokens()

    expect(readCookie('_shopify_y')).toBeFalsy()
  })

  it('clears the tokens when consent is withdrawn', () => {
    persistTrackingTokens()
    expect(readCookie('_shopify_y')).toBeTruthy()

    clearTrackingTokens()

    expect(readCookie('_shopify_y')).toBeFalsy()
    expect(readCookie('_shopify_s')).toBeFalsy()
  })
})
