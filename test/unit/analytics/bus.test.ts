import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmitter } from '#src/runtime/utils/analytics/emitter'
import { forwardToBus } from '#src/runtime/utils/analytics/bus'

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Shirt',
  price: '19.99',
  vendor: 'Acme',
  variantId: 'gid://shopify/ProductVariant/2',
  variantTitle: 'Small',
}

describe('forward to the Shopify analytics bus', () => {
  const publish = vi.fn()

  beforeEach(() => {
    publish.mockClear()

    vi.stubGlobal('window', { Shopify: { analytics: { publish }, currency: { active: 'EUR' } } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps a viewed product to the bus payload', () => {
    const emitter = createEmitter()

    forwardToBus(emitter, { currency: 'usd' })

    emitter.emit('product_viewed', { products: [{ ...product, sku: 'S-1', productType: 'Tops' }] })

    expect(publish).toHaveBeenCalledWith('product_viewed', {
      products: [{
        id: product.id,
        title: 'Shirt',
        vendor: 'Acme',
        variantId: product.variantId,
        variantTitle: 'Small',
        quantity: 1,
        price: { amount: '19.99', currencyCode: 'USD' },
        sku: 'S-1',
        productType: 'Tops',
      }],
    })
  })

  it('prefers the currency on the product over the configured one', () => {
    const emitter = createEmitter()

    forwardToBus(emitter, { currency: 'USD' })

    emitter.emit('product_viewed', { products: [{ ...product, currencyCode: 'CAD', quantity: 3 }] })

    expect(publish.mock.calls[0]![1].products[0]).toMatchObject({ quantity: 3, price: { currencyCode: 'CAD' } })
  })

  it('falls back to the currency Shopify set on the page', () => {
    const emitter = createEmitter()

    forwardToBus(emitter)

    emitter.emit('product_viewed', { products: [product] })

    expect(publish.mock.calls[0]![1].products[0]).toMatchObject({ price: { currencyCode: 'EUR' } })
  })

  it('does not send a product view without products', () => {
    const emitter = createEmitter()

    forwardToBus(emitter)

    emitter.emit('product_viewed', { products: [] })

    expect(publish).not.toHaveBeenCalled()
  })

  it('forwards a collection view with its id and handle', () => {
    const emitter = createEmitter()

    forwardToBus(emitter)

    emitter.emit('collection_viewed', { collection: { id: 'gid://shopify/Collection/9', handle: 'sale' } })

    expect(publish).toHaveBeenCalledWith('collection_viewed', {
      collection: { id: 'gid://shopify/Collection/9', handle: 'sale' },
    })
  })

  it('does not send a collection view without an id', () => {
    const emitter = createEmitter()

    forwardToBus(emitter)

    emitter.emit('collection_viewed', { collection: { id: '' } })

    expect(publish).not.toHaveBeenCalled()
  })

  it('forwards a search view with the search term', () => {
    const emitter = createEmitter()

    forwardToBus(emitter)

    emitter.emit('search_viewed', { searchTerm: 'shirt' })

    expect(publish).toHaveBeenCalledWith('search_viewed', { searchTerm: 'shirt' })
  })

  it('does nothing when the bus is not on the page', () => {
    vi.stubGlobal('window', { Shopify: {} })

    const emitter = createEmitter()

    forwardToBus(emitter)

    expect(() => emitter.emit('search_viewed', { searchTerm: 'shirt' })).not.toThrow()
    expect(publish).not.toHaveBeenCalled()
  })
})
