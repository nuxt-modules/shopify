import type { ShopifyAnalyticsContext } from '../../../module'

import { ref } from 'vue'
import { useNuxtApp } from '#imports'

function createNoopContext(): ShopifyAnalyticsContext {
  return {
    shop: ref(null),
    cart: ref(null),
    setCart: () => {},
    canTrack: () => false,
    publish: () => {},
    subscribe: () => () => {},
    setTrackingConsent: () => {},
    showPreferences: () => Promise.resolve(),
    setShopContext: () => Promise.resolve(null),
  }
}

export function useShopifyAnalytics(): ShopifyAnalyticsContext {
  return useNuxtApp().$shopify?.analytics ?? createNoopContext()
}
