// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { ensureShopifyCookies } from '../../src/runtime/utils/analytics/cookies'

function readCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1]
}

describe('ensureShopifyCookies', () => {
  beforeEach(() => {
    for (const pair of document.cookie.split('; ')) {
      const key = pair.split('=')[0]
      if (key) document.cookie = `${key}=; expires=${new Date(0).toUTCString()}; path=/`
    }
  })

  it('creates both the visitor and session cookies', () => {
    ensureShopifyCookies()

    expect(readCookie('_shopify_y')).toBeTruthy()
    expect(readCookie('_shopify_s')).toBeTruthy()
  })

  it('preserves an existing visitor token across calls', () => {
    ensureShopifyCookies()
    const first = readCookie('_shopify_y')

    ensureShopifyCookies()

    expect(readCookie('_shopify_y')).toBe(first)
  })
})
