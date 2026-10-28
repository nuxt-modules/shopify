// @vitest-environment happy-dom
import type { ShopifyAnalyticsCart } from '#src/types'

import { trackCartAnalytics } from '@shopify/hydrogen'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { createCartAnalyticsStore, toAnalyticsCart } from '#src/runtime/utils/analytics/cart'

type CartLine = ShopifyAnalyticsCart['lines']['nodes'][number]

const publish = vi.fn()

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
  }
}

function cart(updatedAt: string | undefined, lines: CartLine[]): ShopifyAnalyticsCart {
  return { id: 'gid://shopify/Cart/1', updatedAt, cost: { totalAmount: { currencyCode: 'EUR' } }, lines: { nodes: lines } }
}

function events(name: string) {
  return publish.mock.calls.filter(([event]) => event === name).map(([, payload]) => payload)
}

function track(initial: ShopifyAnalyticsCart | null) {
  const current = ref(initial)

  trackCartAnalytics(createCartAnalyticsStore(current))

  return current
}

beforeEach(() => {
  publish.mockClear()
  localStorage.clear()

  window.Shopify = { analytics: { publish, addDestination: vi.fn(), getConfig: () => ({ shop: null, consent: {} }) } } as never
})

describe('createCartAnalyticsStore', () => {
  it('reports a cart change against the cart the page started with', async () => {
    const current = track(cart('1', [line('a', 1)]))

    current.value = cart('2', [line('a', 2)])

    await nextTick()

    expect(events('cart_updated')).toMatchObject([{ prevCart: { updatedAt: '1' }, cart: { updatedAt: '2' } }])
  })

  it('reports the first cart when tracking starts before the visitor has one', async () => {
    const current = track(null)

    current.value = cart('1', [line('a', 1)])

    await nextTick()

    expect(events('cart_updated')).toMatchObject([{ cart: { updatedAt: '1' } }])
  })
})

describe('toAnalyticsCart', () => {
  it('maps the cart to Shopify\'s analytics shape', () => {
    expect(toAnalyticsCart(cart('1', [line('a', 2)]))).toStrictEqual({
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

  it('leaves out lines without product details', () => {
    const { merchandise, ...withoutMerchandise } = line('b', 1)

    expect(merchandise).toBeDefined()
    expect(toAnalyticsCart(cart('1', [line('a', 1), withoutMerchandise]))?.lines.nodes).toHaveLength(1)
  })

  it('has no cart before Shopify confirmed one', () => {
    expect(toAnalyticsCart(cart(undefined, []))).toBeNull()
  })
})
