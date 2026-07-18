// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendSpy } = vi.hoisted(() => ({ sendSpy: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@shopify/hydrogen-react', () => ({
  sendShopifyAnalytics: sendSpy,
  getClientBrowserParameters: () => ({ url: 'https://shop.test/', path: '/' }),
  getTrackingValues: () => ({ uniqueToken: '', visitToken: '', consent: '' }),
  AnalyticsEventName: { PAGE_VIEW_2: 'PAGE_VIEW_2', PRODUCT_VIEW: 'PRODUCT_VIEW', COLLECTION_VIEW: 'COLLECTION_VIEW', SEARCH_VIEW: 'SEARCH_VIEW', ADD_TO_CART: 'ADD_TO_CART' },
  AnalyticsPageType: { product: 'product', collection: 'collection', search: 'search' },
  ShopifySalesChannel: { headless: 'headless' },
}))

const { createEmitter } = await import('../../src/runtime/utils/analytics/emitter')
const { createShopifySubscriber } = await import('../../src/runtime/utils/analytics/subscriber')

const shop = { shopId: 'gid://shopify/Shop/1', acceptedLanguage: 'EN', currency: 'USD', hydrogenSubchannelId: '123' }
const runReady = (cb: () => void) => cb()

function subscriber(canTrack: () => boolean, resolvedShop: typeof shop | null = shop) {
  const emitter = createEmitter()
  createShopifySubscriber(emitter, { shop: () => resolvedShop, canTrack, whenReady: runReady })
  return emitter
}

function collectConsent() {
  document.dispatchEvent(new Event('visitorConsentCollected'))
}

beforeEach(() => {
  sendSpy.mockClear()
  for (const pair of document.cookie.split('; ')) {
    const key = pair.split('=')[0]
    if (key) document.cookie = `${key}=; expires=${new Date(0).toUTCString()}; path=/`
  }
})

describe('shopify subscriber consent gate', () => {
  it('sends nothing when consent is denied', () => {
    subscriber(() => false).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('sends when consent is granted', () => {
    subscriber(() => true).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).toHaveBeenCalledOnce()
  })

  it('writes the visitor tokens Shopify no longer issues', () => {
    subscriber(() => true).emit('page_viewed', { url: 'https://shop.test/' })

    expect(document.cookie).toContain('_shopify_y')
    expect(document.cookie).toContain('_shopify_s')
  })

  it('writes no tracking cookies without consent', () => {
    subscriber(() => false).emit('page_viewed', { url: 'https://shop.test/' })

    expect(document.cookie).not.toContain('_shopify_y')
    expect(document.cookie).not.toContain('_shopify_s')
  })

  it('does not send when shop identity is incomplete', () => {
    subscriber(() => true, null).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('sends the landing page view once the visitor accepts', () => {
    let allowed = false

    subscriber(() => allowed).emit('page_viewed', { url: 'https://shop.test/landing' })

    expect(sendSpy).not.toHaveBeenCalled()

    allowed = true
    collectConsent()

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ url: 'https://shop.test/landing' }) }),
      undefined,
    )
  })

  it('discards what it queued when the visitor declines', () => {
    subscriber(() => false).emit('page_viewed', { url: 'https://shop.test/' })

    collectConsent()

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('never replays an event twice', () => {
    let allowed = false
    const emitter = subscriber(() => allowed)

    emitter.emit('page_viewed', { url: 'https://shop.test/' })

    allowed = true
    collectConsent()
    collectConsent()

    expect(sendSpy).toHaveBeenCalledOnce()
  })

  it('forwards the captured page url instead of the current location', () => {
    subscriber(() => true).emit('page_viewed', { url: 'https://shop.test/products/hoodie' })

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ url: 'https://shop.test/products/hoodie', path: '/products/hoodie' }) }),
      undefined,
    )
  })
})
