// @vitest-environment happy-dom
import type { StorefrontAnalytics } from '@shopify/hydrogen'
import type { ShopifyAnalyticsContext } from '#src/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const state = new Map<string, ReturnType<typeof ref>>()
let nuxtApp: Record<string, unknown> = {}

vi.mock('#imports', () => ({
  useNuxtApp: () => nuxtApp,
  useState: (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))

    return state.get(key)
  },
}))

const { provideAnalytics } = await import('#src/runtime/utils/analytics/context')

const scripts = {
  shop: { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' },
  i18n: { country: 'DE', language: 'DE', currency: 'EUR' },
} as const

function createBus() {
  return { publish: vi.fn(), addDestination: vi.fn(() => vi.fn()), getConfig: vi.fn() }
}

function deferBus() {
  let markReady!: (bus: StorefrontAnalytics) => void

  const ready = new Promise<StorefrontAnalytics | null>(resolve => (markReady = resolve))

  return { ready, markReady }
}

function setup(ready?: Promise<StorefrontAnalytics | null>) {
  return provideAnalytics({
    scripts: ref(scripts),
    ready,
    canTrack: () => true,
    shouldShowBanner: () => false,
    setTrackingConsent: vi.fn(() => Promise.resolve()),
    showPreferences: vi.fn(() => Promise.resolve()),
    setShopContext: vi.fn(() => Promise.resolve(null)),
  }).context
}

beforeEach(() => {
  vi.clearAllMocks()

  state.clear()

  nuxtApp = {}
})

describe('provideAnalytics', () => {
  it('registers the shop and market on the Nuxt app', () => {
    setup()

    const analytics = (nuxtApp.$shopify as { analytics: ShopifyAnalyticsContext }).analytics

    expect(analytics.shop.value).toStrictEqual(scripts.shop)
    expect(analytics.i18n.value).toStrictEqual(scripts.i18n)
  })

  it('publishes to Shopify\'s analytics bus once it is ready', async () => {
    const bus = createBus()
    const { ready, markReady } = deferBus()

    setup(ready).publish('search_viewed', { searchTerm: 'shirt' })

    await Promise.resolve()

    expect(bus.publish).not.toHaveBeenCalled()

    markReady(bus)

    await vi.waitFor(() => expect(bus.publish).toHaveBeenCalledWith('search_viewed', { searchTerm: 'shirt' }))
  })

  it('drops a product view without products', async () => {
    const bus = createBus()
    const ready = Promise.resolve(bus)

    setup(ready).publish('product_viewed', { products: [] })

    await ready

    expect(bus.publish).not.toHaveBeenCalled()
  })

  it('adds a destination to the bus once and removes it through the returned function', async () => {
    const remove = vi.fn()
    const bus = { ...createBus(), addDestination: vi.fn(() => remove) }
    const destination = { name: 'ga4', setup: vi.fn() }

    const removeDestination = setup(Promise.resolve(bus)).addDestination(destination)

    await vi.waitFor(() => expect(bus.addDestination).toHaveBeenCalledExactlyOnceWith(destination))

    removeDestination()

    expect(remove).toHaveBeenCalledOnce()
  })

  it('never adds a destination removed before the bus was ready', async () => {
    const bus = createBus()
    const { ready, markReady } = deferBus()

    setup(ready).addDestination({ name: 'ga4', setup: vi.fn() })()

    markReady(bus)

    await ready

    expect(bus.addDestination).not.toHaveBeenCalled()
  })

  it('stays quiet without a bus, as during server rendering', () => {
    const analytics = setup()

    expect(() => analytics.publish('page_viewed')).not.toThrow()
    expect(analytics.addDestination({ name: 'ga4', setup: vi.fn() })).toBeTypeOf('function')
  })
})
