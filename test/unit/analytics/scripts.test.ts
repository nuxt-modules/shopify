// @vitest-environment happy-dom
import type { ShopifyScriptTagDescriptors } from '@shopify/hydrogen'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyMarket, createNavigation, toScriptsHead, toScriptsOptions } from '#src/runtime/utils/analytics/scripts'

type Router = Parameters<typeof createNavigation>[0]

const shop = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }
const i18n = { country: 'DE', language: 'DE', currency: 'EUR' } as const
const analytics = { autoPageView: true, consent: { mode: 'no-banner' } } as const

afterEach(() => {
  delete (window as unknown as { Shopify?: unknown }).Shopify
})

describe('toScriptsOptions', () => {
  it('passes the shop, the market and the consent to Shopify\'s scripts', () => {
    expect(toScriptsOptions({ shop, i18n }, analytics, { mode: 'no-banner' })).toStrictEqual({
      shop,
      i18n,
      consent: { mode: 'no-banner' },
      analytics: { channel: 'headless' },
    })
  })

  it('attributes events to the hydrogen channel of a configured storefront', () => {
    const options = toScriptsOptions({ shop }, { ...analytics, storefrontId: '123' }, { mode: 'no-banner' })

    expect(options.analytics).toStrictEqual({ channel: 'hydrogen' })
  })

  it('leaves an unknown market to Shopify\'s default', () => {
    expect(toScriptsOptions({ shop }, analytics, { mode: 'no-banner' })).not.toHaveProperty('i18n')
  })
})

describe('toScriptsHead', () => {
  it('keys every tag and keeps the scripts in Hydrogen\'s order', () => {
    const tags = {
      links: [{ tagName: 'link', attributes: { rel: 'preconnect', href: 'https://cdn.shopify.com' } }],
      scripts: [
        { tagName: 'script', attributes: { id: 'shopify-global-bootstrap' }, innerHTML: 'window.Shopify = {}' },
        { tagName: 'script', attributes: { id: 'shopify-standard-actions', type: 'module', src: 'https://cdn.shopify.com/actions.js' } },
      ],
    } as unknown as ShopifyScriptTagDescriptors

    expect(toScriptsHead(tags)).toStrictEqual({
      link: [{ rel: 'preconnect', href: 'https://cdn.shopify.com', key: 'https://cdn.shopify.com' }],
      script: [
        { id: 'shopify-global-bootstrap', key: 'shopify-global-bootstrap', innerHTML: 'window.Shopify = {}', tagPriority: 50 },
        { id: 'shopify-standard-actions', type: 'module', src: 'https://cdn.shopify.com/actions.js', key: 'shopify-standard-actions', innerHTML: undefined, tagPriority: 50 },
      ],
    })
  })
})

describe('applyMarket', () => {
  it('updates the market that Shopify\'s scripts and components read', () => {
    const shopify = {
      locale: 'en',
      country: 'US',
      currency: { active: 'USD' },
      components: { config: { storeDomain: 'https://shop.test', country: 'US', language: 'en' } },
    }

    ;(window as unknown as { Shopify?: unknown }).Shopify = shopify

    applyMarket({ ...i18n, currency: 'eur' })

    expect(shopify).toStrictEqual({
      locale: 'de',
      country: 'DE',
      currency: { active: 'EUR' },
      components: { config: { storeDomain: 'https://shop.test', country: 'DE', language: 'de' } },
    })
  })
})

describe('createNavigation', () => {
  it('navigates within the app through the router', async () => {
    const router = { push: vi.fn(() => Promise.resolve()) }

    await createNavigation(router as unknown as Router)(`${window.location.origin}/products/shirt?variant=1#reviews`)

    expect(router.push).toHaveBeenCalledWith('/products/shirt?variant=1#reviews')
  })

  it('leaves the app for another origin', () => {
    const router = { push: vi.fn(() => Promise.resolve()) }
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})

    createNavigation(router as unknown as Router)('https://checkout.example.com/cart')

    expect(assign).toHaveBeenCalledWith('https://checkout.example.com/cart')
    expect(router.push).not.toHaveBeenCalled()
  })
})
