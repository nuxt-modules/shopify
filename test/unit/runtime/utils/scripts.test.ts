// @vitest-environment happy-dom
import type { ShopifyScriptTagDescriptors } from '@shopify/hydrogen'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNavigation, toScriptsHead, toScriptsOptions } from '#src/runtime/utils/scripts'

type Router = Parameters<typeof createNavigation>[0]

const shop = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }
const i18n = { country: 'DE', language: 'DE', currency: 'EUR' } as const

afterEach(() => {
  delete (window as unknown as { Shopify?: unknown }).Shopify
})

describe('toScriptsOptions', () => {
  it('passes the shop, the market and the consent to Shopify\'s scripts', () => {
    expect(toScriptsOptions({ shop, i18n, shopifyAnalytics: true }, undefined, { mode: 'no-banner' })).toStrictEqual({
      shop,
      i18n,
      consent: { mode: 'no-banner' },
      shopifyAnalytics: true,
      analytics: { channel: 'headless' },
    })
  })

  it('leaves Shopify\'s analytics and performance scripts out when the shop context says so', () => {
    expect(toScriptsOptions({ shop, i18n, shopifyAnalytics: false }, undefined, { mode: 'no-banner' })).toMatchObject({ shopifyAnalytics: false })
  })

  it('attributes events to the hydrogen channel of a configured storefront', () => {
    const options = toScriptsOptions({ shop, shopifyAnalytics: true }, '123', { mode: 'no-banner' })

    expect(options.analytics).toStrictEqual({ channel: 'hydrogen' })
  })

  it('leaves an unknown market to Shopify\'s default', () => {
    expect(toScriptsOptions({ shop, shopifyAnalytics: true }, undefined, { mode: 'no-banner' })).not.toHaveProperty('i18n')
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
