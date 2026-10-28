// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, watchEffect } from 'vue'

import { createCustomerPrivacy } from '#src/runtime/utils/analytics/consent'

const accepted = { analytics: true, marketing: true, preferences: true, sale_of_data: true }

function stubCustomerPrivacy({ bannerRequired = false } = {}) {
  let allowed = false

  const api = {
    analyticsProcessingAllowed: () => allowed,
    shouldShowBanner: () => bannerRequired && !allowed,
    setTrackingConsent: vi.fn(async (consent: { analytics: boolean }) => {
      allowed = consent.analytics
    }),
  }

  const shopify = { customerPrivacy: {} as typeof api | Record<string, never> }

  ;(window as unknown as { Shopify?: unknown }).Shopify = shopify

  return {
    api,
    load: () => {
      shopify.customerPrivacy = api

      document.dispatchEvent(new Event('consentTrackingApiLoaded'))
    },
    collect: () => {
      allowed = true

      document.dispatchEvent(new Event('visitorConsentCollected'))
    },
  }
}

afterEach(() => {
  delete (window as unknown as { Shopify?: unknown }).Shopify
  delete (window as unknown as { privacyBanner?: unknown }).privacyBanner
})

describe('createCustomerPrivacy', () => {
  it('cannot track until the privacy api that Shopify\'s scripts load allows it', () => {
    const { load } = stubCustomerPrivacy()

    const privacy = createCustomerPrivacy('no-banner')

    privacy.connect()

    expect(privacy.canTrack()).toBe(false)

    load()

    expect(privacy.canTrack()).toBe(false)
  })

  it('keeps the server state until it connects after hydration', () => {
    const { load, collect } = stubCustomerPrivacy()

    load()
    collect()

    const privacy = createCustomerPrivacy('no-banner')

    expect(privacy.canTrack()).toBe(false)

    privacy.connect()

    expect(privacy.canTrack()).toBe(true)
  })

  it('re-renders a template that reads it when consent is collected', async () => {
    const { load, collect } = stubCustomerPrivacy()

    const privacy = createCustomerPrivacy('no-banner')

    privacy.connect()
    load()

    const rendered: boolean[] = []

    watchEffect(() => rendered.push(privacy.canTrack()))

    collect()

    await nextTick()

    expect(rendered).toStrictEqual([false, true])
  })

  it('records the choice through the privacy api', async () => {
    const { api, load } = stubCustomerPrivacy()

    const privacy = createCustomerPrivacy('no-banner')

    privacy.connect()
    load()

    await privacy.setTrackingConsent(accepted)

    expect(api.setTrackingConsent).toHaveBeenCalledWith(accepted)
    expect(privacy.canTrack()).toBe(true)
  })

  it('rejects when the privacy api cannot store the choice', async () => {
    const { api, load } = stubCustomerPrivacy()

    api.setTrackingConsent.mockRejectedValueOnce(new Error('offline'))

    const privacy = createCustomerPrivacy('no-banner')

    privacy.connect()
    load()

    await expect(privacy.setTrackingConsent(accepted)).rejects.toThrow('offline')
  })

  it('reports whether Shopify asks for a banner for the visitor', async () => {
    const { load } = stubCustomerPrivacy({ bannerRequired: true })

    const privacy = createCustomerPrivacy('no-banner')

    privacy.connect()
    load()

    expect(privacy.shouldShowBanner()).toBe(true)

    await privacy.setTrackingConsent(accepted)

    expect(privacy.shouldShowBanner()).toBe(false)
  })

  it('holds the events of a custom banner until the visitor chooses', async () => {
    const { load } = stubCustomerPrivacy()

    const privacy = createCustomerPrivacy('custom-banner')

    privacy.connect()
    load()

    let settled = false

    if (privacy.consent.mode === 'custom-banner') void privacy.consent.setup().then(() => (settled = true))

    await nextTick()

    expect(settled).toBe(false)

    await privacy.setTrackingConsent(accepted)

    await vi.waitFor(() => expect(settled).toBe(true))
  })

  it('passes only the mode to Shopify\'s own banner and opens its preferences only for it', async () => {
    const showPreferences = vi.fn()

    ;(window as unknown as { privacyBanner?: unknown }).privacyBanner = { showPreferences }

    const ownBanner = createCustomerPrivacy('default-banner')

    await createCustomerPrivacy('no-banner').showPreferences()
    await ownBanner.showPreferences()

    expect(ownBanner.consent).toStrictEqual({ mode: 'default-banner' })
    expect(showPreferences).toHaveBeenCalledTimes(1)
  })
})
