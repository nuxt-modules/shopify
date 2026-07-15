import { describe, expect, it } from 'vitest'

import { configSchema } from '../../src/schemas'

const base = {
  name: 'shop',
  clients: { storefront: { publicAccessToken: 'token' } },
}

function parseAnalytics(analytics?: unknown) {
  return configSchema.parse(analytics === undefined ? base : { ...base, analytics }).analytics
}

describe('analytics config', () => {
  it('is disabled by default', () => {
    expect(parseAnalytics()).toBe(false)
  })

  it('treats `true` as the default enabled config', () => {
    expect(parseAnalytics(true)).toMatchObject({})
  })

  it('disables when set to `false`', () => {
    expect(parseAnalytics(false)).toBe(false)
  })

  it('enables with an empty config object', () => {
    expect(parseAnalytics({})).toMatchObject({})
  })

  it('keeps an explicit config object and defaults its options', () => {
    const analytics = parseAnalytics({ storefrontId: '1234567' })

    expect(analytics).toMatchObject({ storefrontId: '1234567' })
  })

  it('defaults the privacy banner off inside consent', () => {
    const analytics = parseAnalytics({ consent: { checkoutDomain: 'checkout.shop.com' } })

    expect(analytics).toMatchObject({ consent: { checkoutDomain: 'checkout.shop.com', withPrivacyBanner: false } })
  })

  it('normalizes a numeric storefrontId to a string (Nuxt coerces numeric env values)', () => {
    expect(parseAnalytics({ storefrontId: 1234567 })).toMatchObject({ storefrontId: '1234567' })
    expect(parseAnalytics({ shopId: 42 })).toMatchObject({ shopId: '42' })
  })
})
