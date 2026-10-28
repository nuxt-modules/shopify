import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const state = new Map<string, ReturnType<typeof ref>>()

vi.mock('#imports', () => ({
  useNuxtApp: () => ({}),

  useState: (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))

    return state.get(key)
  },
}))

const { useAnalyticsCart, useShopifyAnalytics } = await import('#src/runtime/composables/analytics/client')

const cart = { id: 'gid://shopify/Cart/1', updatedAt: '1', lines: { nodes: [] } }

beforeEach(() => {
  state.clear()
})

describe('useShopifyAnalytics', () => {
  it('keeps the cart in shared state while analytics is not running', () => {
    useShopifyAnalytics().setCart(cart)

    expect(useAnalyticsCart().value).toEqual(cart)
    expect(useShopifyAnalytics().cart.value).toEqual(cart)
  })
})
