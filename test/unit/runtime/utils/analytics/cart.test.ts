import type { CartData, CartState } from '@shopify/hydrogen'

import { EMPTY_CART_STATE } from '@shopify/hydrogen'
import { describe, expect, it } from 'vitest'

import { isCartSettled, toAnalyticsCart } from '#src/runtime/utils/analytics/cart'

type CartLine = CartData['lines']['nodes'][number]

function line(id: string, quantity: number): CartLine {
  return {
    id,
    quantity,
    cost: { amountPerQuantity: { amount: '10.0', currencyCode: 'EUR' } },
    merchandise: {
      id: `gid://shopify/ProductVariant/${id}`,
      title: 'Black / M',
      sku: `SKU-${id}`,
      product: { id: `gid://shopify/Product/${id}`, title: `Product ${id}`, vendor: 'Acme', productType: 'Hoodie', handle: `product-${id}` },
    },
  } as unknown as CartLine
}

function cart(id: string, updatedAt: string | undefined, lines: CartLine[]): CartData {
  return { id, updatedAt, cost: { totalAmount: { currencyCode: 'EUR' } }, lines: { nodes: lines } } as unknown as CartData
}

function state(overrides: Partial<CartState> = {}): CartState {
  return { ...EMPTY_CART_STATE, loading: false, ...overrides } as CartState
}

describe('toAnalyticsCart', () => {
  it('maps the cart to Shopify\'s analytics shape', () => {
    expect(toAnalyticsCart(cart('gid://shopify/Cart/1', '1', [line('a', 2)]))).toStrictEqual({
      id: 'gid://shopify/Cart/1',
      updatedAt: '1',
      cost: { totalAmount: { currencyCode: 'EUR' } },
      lines: {
        nodes: [{
          id: 'a',
          quantity: 2,
          merchandise: {
            id: 'gid://shopify/ProductVariant/a',
            title: 'Black / M',
            price: { amount: '10.0', currencyCode: 'EUR' },
            sku: 'SKU-a',
            product: { id: 'gid://shopify/Product/a', title: 'Product a', vendor: 'Acme', productType: 'Hoodie', handle: 'product-a' },
          },
        }],
      },
    })
  })

  it('leaves out lines without merchandise', () => {
    const { merchandise, ...withoutMerchandise } = line('b', 1)

    expect(merchandise).toBeDefined()
    expect(toAnalyticsCart(cart('gid://shopify/Cart/1', '1', [line('a', 1), withoutMerchandise as CartLine]))?.lines.nodes).toHaveLength(1)
  })

  it('keeps a line whose product has no vendor, as Hydrogen\'s cart tracker does', () => {
    const vendorless = line('b', 1)

    vendorless.merchandise = { ...vendorless.merchandise!, product: { ...vendorless.merchandise!.product, vendor: undefined } } as never

    expect(toAnalyticsCart(cart('gid://shopify/Cart/1', '1', [vendorless]))?.lines.nodes).toMatchObject([{ merchandise: { product: { vendor: '' } } }])
  })

  it('stamps a cart without an update time, as Hydrogen\'s cart tracker does', () => {
    expect(toAnalyticsCart(cart('gid://shopify/Cart/1', undefined, []))?.updatedAt).toEqual(expect.any(String))
  })

  it('has no cart before Shopify created one', () => {
    expect(toAnalyticsCart(cart('', undefined, []))).toBeNull()
  })
})

describe('isCartSettled', () => {
  it('settles a loaded cart without changes in flight', () => {
    expect(isCartSettled(state())).toBe(true)
  })

  it.each([
    ['still loading', { loading: true }],
    ['revalidating', { revalidating: true }],
    ['changing its prices', { pending: { ...EMPTY_CART_STATE.pending, cost: true } }],
    ['adding a line without a price state', { pending: { ...EMPTY_CART_STATE.pending, cost: undefined, lines: new Set(['optimistic:1']) } }],
    ['applying a discount code without a price state', { pending: { ...EMPTY_CART_STATE.pending, cost: undefined, discountCodes: new Set(['SALE']) } }],
    ['changing its note', { pending: { ...EMPTY_CART_STATE.pending, note: true } }],
    ['changing its attributes', { pending: { ...EMPTY_CART_STATE.pending, attributes: true } }],
  ])('waits while the cart is %s', (_, overrides) => {
    expect(isCartSettled(state(overrides as Partial<CartState>))).toBe(false)
  })
})
