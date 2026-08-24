// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, watchEffect } from 'vue'

import { parseStoreDomain, setupCustomerPrivacy } from '#src/runtime/utils/analytics/consent'

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

describe('parseStoreDomain', () => {
  it('uses the longest domain the storefront and checkout share', () => {
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

type ConsentCallback = (result: { error?: string }) => void

function stubCustomerPrivacy() {
  let allowed = false

  const api = {
    analyticsProcessingAllowed: () => allowed,
    marketingAllowed: () => allowed,
    saleOfDataAllowed: () => allowed,
    setTrackingConsent: vi.fn((_consent: unknown, callback?: ConsentCallback) => {
      allowed = true

      callback?.({})
    }),
  }

  ;(window as unknown as { Shopify?: unknown }).Shopify = { customerPrivacy: api }

  return {
    api,
    grant: () => {
      allowed = true

      document.dispatchEvent(new Event('visitorConsentCollected'))
    },
  }
}

function setup() {
  return setupCustomerPrivacy({
    checkoutDomain: 'shop.example.com',
    storefrontAccessToken: 'tok',
    banner: false,
  })
}

afterEach(() => {
  delete (window as unknown as { Shopify?: unknown }).Shopify
})

describe('canTrack', () => {
  it('reports the consent state once the privacy api has loaded', async () => {
    const { grant } = stubCustomerPrivacy()

    const privacy = setup()

    await privacy.ready

    expect(privacy.canTrack()).toBe(false)

    grant()

    expect(privacy.canTrack()).toBe(true)
  })

  it('re-renders a template that reads it when consent is collected', async () => {
    const { grant } = stubCustomerPrivacy()

    const privacy = setup()

    await privacy.ready

    const rendered: boolean[] = []

    watchEffect(() => rendered.push(privacy.canTrack()))

    grant()

    await nextTick()

    expect(rendered).toStrictEqual([false, true])
  })

  it('re-renders after consent is granted through setTrackingConsent', async () => {
    stubCustomerPrivacy()

    const privacy = setup()

    await privacy.ready

    const rendered: boolean[] = []

    watchEffect(() => rendered.push(privacy.canTrack()))

    privacy.setTrackingConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true })

    await nextTick()

    expect(rendered).toStrictEqual([false, true])
  })
})
