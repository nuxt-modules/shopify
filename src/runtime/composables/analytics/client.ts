import type { ShopifyAnalyticsCart, ShopifyAnalyticsContext } from '../../../module'

import { ref } from 'vue'
import { useNuxtApp, useState } from '#imports'

export function useAnalyticsCart() {
  return useState<ShopifyAnalyticsCart | null>('shopify-analytics-cart', () => null)
}

function createInactiveContext(): ShopifyAnalyticsContext {
  const cart = useAnalyticsCart()

  return {
    shop: ref(null),
    cart,
    setCart: value => (cart.value = value),
    canTrack: () => false,
    publish: () => {},
    subscribe: () => () => {},
    setTrackingConsent: () => {},
    showPreferences: () => Promise.resolve(),
    setShopContext: () => Promise.resolve(null),
  }
}

/**
 * Provides access to the Shopify analytics context.
 *
 * @returns the analytics context with the current shop, cart and consent state
 */
export function useShopifyAnalytics(): ShopifyAnalyticsContext {
  return useNuxtApp().$shopify?.analytics ?? createInactiveContext()
}
