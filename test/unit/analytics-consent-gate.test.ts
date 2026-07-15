// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendSpy } = vi.hoisted(() => ({ sendSpy: vi.fn() }))

vi.mock('@shopify/hydrogen-react', () => ({
  sendShopifyAnalytics: sendSpy,
  getClientBrowserParameters: () => ({ url: 'https://shop.test/', path: '/' }),
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

beforeEach(() => {
  sendSpy.mockClear()
  for (const pair of document.cookie.split('; ')) {
    const key = pair.split('=')[0]
    if (key) document.cookie = `${key}=; expires=${new Date(0).toUTCString()}; path=/`
  }
})

describe('shopify subscriber consent gate', () => {
  it('sends nothing and sets no tracking cookie when consent is denied', () => {
    subscriber(() => false).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).not.toHaveBeenCalled()
    expect(document.cookie).not.toContain('_shopify_y')
  })

  it('sends and sets the visitor cookie when consent is granted', () => {
    subscriber(() => true).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).toHaveBeenCalledOnce()
    expect(document.cookie).toContain('_shopify_y')
  })

  it('does not send when shop identity is incomplete', () => {
    subscriber(() => true, null).emit('page_viewed', { url: 'https://shop.test/' })

    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('forwards the captured page url instead of the current location', () => {
    subscriber(() => true).emit('page_viewed', { url: 'https://shop.test/products/hoodie' })

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ url: 'https://shop.test/products/hoodie', path: '/products/hoodie' }) }),
      undefined,
    )
  })
})
