import { afterEach, describe, expect, it, vi } from 'vitest'

const { useShopifyAnalytics } = await import('#src/runtime/composables/analytics/client')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useShopifyAnalytics', () => {
  it('returns the analytics bus that Shopify\'s scripts created', () => {
    const analytics = { publish: vi.fn(), addDestination: vi.fn(), getConfig: vi.fn() }

    vi.stubGlobal('window', { Shopify: { analytics } })

    expect(useShopifyAnalytics()).toBe(analytics)
  })

  it('returns nothing before Shopify\'s scripts have loaded', () => {
    vi.stubGlobal('window', {})

    expect(useShopifyAnalytics()).toBeNull()
  })

  it('returns nothing on the server, without touching the browser', () => {
    vi.stubGlobal('__NUXT_SERVER__', true)

    expect(useShopifyAnalytics()).toBeNull()
  })
})
