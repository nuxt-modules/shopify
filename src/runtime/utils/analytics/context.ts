import type { ProductViewPayload, StorefrontAnalytics } from '@shopify/hydrogen'
import type { Ref } from 'vue'

import type { ShopifyAnalyticsContext } from '../../../module'
import type { ShopifyScriptsShopContext } from './shop'

import { computed } from 'vue'
import defu from 'defu'
import { useNuxtApp } from '#imports'

import { useAnalyticsCart } from '../../composables/analytics/client'
import { createLogger } from '../log'
import { validateProducts } from './validation'

export interface ProvideAnalyticsOptions extends Pick<ShopifyAnalyticsContext, 'canTrack' | 'shouldShowBanner' | 'setTrackingConsent' | 'showPreferences' | 'setShopContext'> {
  scripts: Ref<ShopifyScriptsShopContext | null>
  ready?: Promise<StorefrontAnalytics | null>
}

export function provideAnalytics({ scripts, ready, ...actions }: ProvideAnalyticsOptions) {
  const nuxtApp = useNuxtApp()
  const cart = useAnalyticsCart()

  const whenReady = (callback: (bus: StorefrontAnalytics) => void) => {
    void ready
      ?.then(bus => bus && callback(bus))
      .catch(error => createLogger().debug('Analytics callback failed:', error))
  }

  const publish: StorefrontAnalytics['publish'] = (event, ...payload) => {
    if (event === 'product_viewed' && !validateProducts((payload[0] as ProductViewPayload | undefined)?.products, event)) return

    whenReady(bus => bus.publish(event, ...payload))
  }

  const addDestination: StorefrontAnalytics['addDestination'] = (destination) => {
    let remove: (() => void) | undefined
    let removed = false

    whenReady((bus) => {
      if (!removed) remove = bus.addDestination(destination)
    })

    return () => {
      removed = true
      remove?.()
    }
  }

  const context: ShopifyAnalyticsContext = {
    ...actions,
    shop: computed(() => scripts.value?.shop ?? null),
    i18n: computed(() => scripts.value?.i18n ?? null),
    cart,
    setCart: value => (cart.value = value),
    publish,
    addDestination,
  }

  const shopifyContext = nuxtApp.$shopify as { analytics?: ShopifyAnalyticsContext } ?? {}

  shopifyContext.analytics = defu(context, shopifyContext.analytics)

  if (!nuxtApp.$shopify) nuxtApp.$shopify = shopifyContext

  return { context, whenReady }
}
