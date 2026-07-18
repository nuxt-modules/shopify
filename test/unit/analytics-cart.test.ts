// @vitest-environment happy-dom
import type { ShopifyAnalyticsCart, ShopifyAnalyticsCartLine } from '../../src/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCartTracker } from '../../src/runtime/utils/analytics/cart'

function line(id: string, quantity: number): ShopifyAnalyticsCartLine {
  return {
    id,
    quantity,
    merchandise: {
      id: `gid://shopify/ProductVariant/${id}`,
      title: 'Default',
      price: { amount: '10.00' },
      product: {
        id: `gid://shopify/Product/${id}`,
        title: `Product ${id}`,
        vendor: 'Acme',
      },
    },
  }
}

function cart(updatedAt: string, lines: ShopifyAnalyticsCartLine[]): ShopifyAnalyticsCart {
  return { id: 'gid://shopify/Cart/1', updatedAt, lines }
}

function setup() {
  const publish = vi.fn()

  return { publish, track: createCartTracker({ publish }) }
}

function events(publish: ReturnType<typeof vi.fn>, name: string) {
  return publish.mock.calls.filter(([event]) => event === name).map(([, payload]) => payload)
}

beforeEach(() => {
  localStorage.clear()
})

describe('analytics cart events', () => {
  it('publishes nothing without an updated cart', () => {
    const { publish, track } = setup()

    track(null)
    track({ id: 'gid://shopify/Cart/1', lines: [] })

    expect(publish).not.toHaveBeenCalled()
  })

  it('publishes an update when the cart changes', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 1)]))

    expect(events(publish, 'cart_updated')).toHaveLength(1)
  })

  it('ignores a cart that has not changed since the last event', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 1)]))
    publish.mockClear()

    track(cart('1', [line('a', 1)]))

    expect(publish).not.toHaveBeenCalled()
  })

  it('does not replay the stored cart on a fresh load', () => {
    const first = setup()
    first.track(cart('1', [line('a', 1)]))

    const second = setup()
    second.track(cart('1', [line('a', 1)]))

    expect(second.publish).not.toHaveBeenCalled()
  })

  it('reports a new line as added', () => {
    const { publish, track } = setup()

    track(cart('1', []))
    track(cart('2', [line('a', 1)]))

    const added = events(publish, 'product_added_to_cart')

    expect(added).toHaveLength(1)
    expect(added[0].currentLine.id).toBe('a')
  })

  it('reports a raised quantity as added', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 1)]))
    publish.mockClear()

    track(cart('2', [line('a', 3)]))

    const added = events(publish, 'product_added_to_cart')

    expect(added).toHaveLength(1)
    expect(added[0].prevLine.quantity).toBe(1)
    expect(added[0].currentLine.quantity).toBe(3)
  })

  it('reports a lowered quantity as removed', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 3)]))
    track(cart('2', [line('a', 1)]))

    expect(events(publish, 'product_removed_from_cart')).toHaveLength(1)
  })

  it('reports a dropped line as removed without a current line', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 1), line('b', 1)]))
    track(cart('2', [line('a', 1)]))

    const removed = events(publish, 'product_removed_from_cart')

    expect(removed).toHaveLength(1)
    expect(removed[0].prevLine.id).toBe('b')
    expect(removed[0].currentLine).toBeUndefined()
  })

  it('reports each line of a multi line change', () => {
    const { publish, track } = setup()

    track(cart('1', [line('a', 1), line('b', 1)]))
    publish.mockClear()

    track(cart('2', [line('a', 2), line('c', 1)]))

    expect(events(publish, 'product_added_to_cart')).toHaveLength(2)
    expect(events(publish, 'product_removed_from_cart')).toHaveLength(1)
  })
})
