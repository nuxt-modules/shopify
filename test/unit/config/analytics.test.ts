import { describe, expect, it } from 'vitest'

import { configObjectSchema } from '#src/schemas'

const base = {
  name: 'shop',
  clients: { storefront: { publicAccessToken: 'token' } },
}

function parseAnalytics(analytics?: unknown) {
  return configObjectSchema.parse(analytics === undefined ? base : { ...base, analytics }).analytics
}

describe('analytics config', () => {
  it('is disabled by default', () => {
    expect(parseAnalytics()).toBe(false)
  })

  it('treats `true` as the default enabled config', () => {
    expect(parseAnalytics(true)).toStrictEqual({ autoPageView: true, consent: { mode: 'no-banner' } })
  })

  it('disables when set to `false`', () => {
    expect(parseAnalytics(false)).toBe(false)
  })

  it('enables with an empty config object', () => {
    expect(parseAnalytics({})).toStrictEqual({ autoPageView: true, consent: { mode: 'no-banner' } })
  })

  it('loads no banner unless a consent mode is chosen', () => {
    expect(parseAnalytics({ consent: {} })).toMatchObject({ consent: { mode: 'no-banner' } })
  })

  it('accepts Shopify\'s consent modes only', () => {
    expect(parseAnalytics({ consent: { mode: 'custom-banner' } })).toMatchObject({ consent: { mode: 'custom-banner' } })
    expect(() => parseAnalytics({ consent: { mode: 'banner' } })).toThrow()
  })

  it('turns a numeric storefrontId into a string', () => {
    expect(parseAnalytics({ storefrontId: 1234567 })).toMatchObject({ storefrontId: '1234567' })
    expect(parseAnalytics({ shopId: 42 })).toMatchObject({ shopId: '42' })
  })
})
