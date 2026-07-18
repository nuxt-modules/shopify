// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { parseStoreDomain } from '../../src/runtime/utils/analytics/consent'

declare global {
  interface Window {
    happyDOM: {
      setURL(url: string): void
    }
  }
}

function onHost(host: string, checkoutDomain: string) {
  window.happyDOM.setURL(`https://${host}/`)

  return parseStoreDomain(checkoutDomain)
}

describe('analytics cookie domain', () => {
  it('shares the widest domain the storefront and checkout have in common', () => {
    expect(onHost('shop.example.com', 'checkout.example.com')).toBe('example.com')
  })

  it('keeps the full host when the checkout domain is the storefront itself', () => {
    expect(onHost('shop.example.com', 'shop.example.com')).toBe('shop.example.com')
  })

  it('shares nothing when only the public suffix matches', () => {
    expect(onHost('shop.example.com', 'checkout.myshop.com')).toBeUndefined()
  })

  it('stops at the first mismatched label', () => {
    expect(onHost('a.b.com', 'c.b.net')).toBeUndefined()
  })

  it('shares nothing between unrelated domains', () => {
    expect(onHost('shop.example.com', 'checkout.shopify.io')).toBeUndefined()
  })
})
