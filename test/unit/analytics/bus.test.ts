import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { publishToBus, subscribeToBus } from '#src/runtime/utils/analytics/bus'

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Shirt',
  price: '19.99',
  vendor: 'Acme',
  variantId: 'gid://shopify/ProductVariant/2',
  variantTitle: 'Small',
}

const publish = vi.fn()

function stubBus(extra: Record<string, unknown> = {}) {
  vi.stubGlobal('window', { Shopify: { analytics: { publish, ...extra }, currency: { active: 'EUR' } } })
}

beforeEach(() => {
  publish.mockClear()

  stubBus()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('publish to the Shopify analytics bus', () => {
  it('maps a viewed product to the bus payload', () => {
    publishToBus('product_viewed', { products: [{ ...product, sku: 'S-1', productType: 'Tops' }] }, 'usd')

    expect(publish).toHaveBeenCalledWith('product_viewed', {
      products: [{
        id: product.id,
        title: 'Shirt',
        vendor: 'Acme',
        variantId: product.variantId,
        variantTitle: 'Small',
        quantity: 1,
        price: { amount: '19.99', currencyCode: 'usd' },
        sku: 'S-1',
        productType: 'Tops',
      }],
    })
  })

  it('prefers the currency on the product over the configured one', () => {
    publishToBus('product_viewed', { products: [{ ...product, currencyCode: 'CAD', quantity: 3 }] }, 'USD')

    expect(publish.mock.calls[0]![1].products[0]).toMatchObject({ quantity: 3, price: { currencyCode: 'CAD' } })
  })

  it('falls back to the currency Shopify set on the page', () => {
    publishToBus('product_viewed', { products: [product] })

    expect(publish.mock.calls[0]![1].products[0]).toMatchObject({ price: { currencyCode: 'EUR' } })
  })

  it('does not send a product view without products', () => {
    publishToBus('product_viewed', { products: [] })

    expect(publish).not.toHaveBeenCalled()
  })

  it('forwards a collection view with its id and handle', () => {
    publishToBus('collection_viewed', { collection: { id: 'gid://shopify/Collection/9', handle: 'sale' } })

    expect(publish).toHaveBeenCalledWith('collection_viewed', {
      collection: { id: 'gid://shopify/Collection/9', handle: 'sale' },
    })
  })

  it('does not send a collection view without an id', () => {
    publishToBus('collection_viewed', { collection: { id: '' } })

    expect(publish).not.toHaveBeenCalled()
  })

  it('forwards a search view with the search term', () => {
    publishToBus('search_viewed', { searchTerm: 'shirt' })

    expect(publish).toHaveBeenCalledWith('search_viewed', { searchTerm: 'shirt' })
  })

  it('reshapes the cart for a cart view', () => {
    publishToBus('cart_viewed', {
      cart: {
        id: 'gid://shopify/Cart/1',
        updatedAt: '2026-01-01T00:00:00Z',
        lines: [{
          id: 'l1',
          quantity: 2,
          merchandise: {
            id: 'v1',
            title: 'Small',
            price: { amount: '5.00' },
            product: { id: 'p1', title: 'Shirt', vendor: 'Acme' },
          },
        }],
      },
    }, 'cad')

    const { cart } = publish.mock.calls[0]![1]

    expect(cart.id).toBe('gid://shopify/Cart/1')
    expect(cart.lines.nodes).toHaveLength(1)
    expect(cart.lines.nodes[0].merchandise.price).toEqual({ amount: '5.00', currencyCode: 'cad' })
  })

  it('sends a null cart for a cart view without a cart', () => {
    publishToBus('cart_viewed', { cart: null })

    expect(publish).toHaveBeenCalledWith('cart_viewed', { cart: null })
  })

  it('does nothing when the bus is not on the page', () => {
    vi.stubGlobal('window', { Shopify: {} })

    expect(() => publishToBus('search_viewed', { searchTerm: 'shirt' })).not.toThrow()
    expect(publish).not.toHaveBeenCalled()
  })
})

describe('subscribe to the Shopify analytics bus', () => {
  it('registers a destination that hands the bus payload to the callback', () => {
    const stop = vi.fn()
    const subscribe = vi.fn((_event: string, _callback: (payload: unknown) => void) => stop)
    const remove = vi.fn()

    const addDestination = vi.fn((destination: { setup: (context: { subscribe: typeof subscribe }) => unknown }) => {
      destination.setup({ subscribe })

      return remove
    })

    stubBus({ addDestination })

    const callback = vi.fn()

    const unsubscribe = subscribeToBus('product_added_to_cart', callback)

    expect(subscribe).toHaveBeenCalledWith('product_added_to_cart', expect.any(Function))

    subscribe.mock.calls[0]![1]({ cart: { id: '1' } })

    expect(callback).toHaveBeenCalledWith({ cart: { id: '1' } })

    unsubscribe()

    expect(remove).toHaveBeenCalled()
  })

  it('gives every subscription its own destination name', () => {
    const addDestination = vi.fn((_destination: { name: string }) => () => {})

    stubBus({ addDestination })

    subscribeToBus('page_viewed', vi.fn())
    subscribeToBus('page_viewed', vi.fn())

    const names = addDestination.mock.calls.map(([destination]) => destination.name)

    expect(new Set(names).size).toBe(2)
  })

  it('returns a no-op when the bus is not on the page', () => {
    vi.stubGlobal('window', { Shopify: {} })

    expect(() => subscribeToBus('page_viewed', vi.fn())()).not.toThrow()
  })
})
