// @vitest-environment happy-dom
import type { ShopifyAnalyticsCart, ShopifyAnalyticsCartLine } from '#src/types'

import { trackCartAnalytics } from '@shopify/hydrogen'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { createCartAnalyticsStore } from '#src/runtime/utils/analytics/cart'

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

const publish = vi.fn()

function setup(currency?: string) {
  const current = ref<ShopifyAnalyticsCart | null>(null)

  trackCartAnalytics(createCartAnalyticsStore(current, currency))

  const update = async (next: ShopifyAnalyticsCart | null) => {
    current.value = next

    await nextTick()
  }

  return { update }
}

function events(name: string) {
  return publish.mock.calls.filter(([event]) => event === name).map(([, payload]) => payload)
}

beforeEach(() => {
  localStorage.clear()

  publish.mockClear()

  Reflect.set(window, 'Shopify', { analytics: { publish, getConfig: () => ({ shop: { shopId: '1' } }) } })
})

describe('cart analytics store', () => {
  it('publishes the cart update and an add for each new line', async () => {
    const { update } = setup('usd')

    await update(cart('2026-01-01T00:00:00Z', [line('1', 1), line('2', 2)]))

    expect(events('cart_updated')).toHaveLength(1)
    expect(events('product_added_to_cart')).toHaveLength(2)
    expect(events('product_removed_from_cart')).toHaveLength(0)
  })

  it('does not publish again when the cart has not changed', async () => {
    const { update } = setup()

    const first = cart('2026-01-01T00:00:00Z', [line('1', 1)])

    await update(first)
    await update({ ...first })

    expect(events('cart_updated')).toHaveLength(1)
  })

  it('publishes an add when a quantity goes up', async () => {
    const { update } = setup()

    await update(cart('2026-01-01T00:00:00Z', [line('1', 1)]))

    publish.mockClear()

    await update(cart('2026-01-01T00:01:00Z', [line('1', 3)]))

    expect(events('product_added_to_cart')).toHaveLength(1)
    expect(events('product_added_to_cart')[0]).toMatchObject({
      prevLine: { quantity: 1 },
      currentLine: { quantity: 3 },
    })
  })

  it('publishes a removal when a quantity goes down or a line goes away', async () => {
    const { update } = setup()

    await update(cart('2026-01-01T00:00:00Z', [line('1', 3), line('2', 1)]))

    publish.mockClear()

    await update(cart('2026-01-01T00:01:00Z', [line('1', 1)]))

    expect(events('product_removed_from_cart')).toHaveLength(2)
  })

  it('gives each line a currency from the configured one when the cart has none', async () => {
    const { update } = setup('cad')

    await update(cart('2026-01-01T00:00:00Z', [line('1', 1)]))

    expect(events('product_added_to_cart')[0].currentLine.merchandise.price).toMatchObject({ amount: '10.00', currencyCode: 'cad' })
  })

  it('ignores a cleared cart', async () => {
    const { update } = setup()

    await update(cart('2026-01-01T00:00:00Z', [line('1', 1)]))

    publish.mockClear()

    await update(null)

    expect(publish).not.toHaveBeenCalled()
  })
})
