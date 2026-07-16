import type {
  ShopAnalytics,
  ShopifyAnalyticsCart,
  ShopifyAnalyticsContext,
} from '../../module'

import { ref } from 'vue'
import {
  defineNuxtPlugin,
  useRuntimeConfig,
} from '#imports'

import { createEmitter } from '../utils/analytics/emitter'
import { setupCustomerPrivacy } from '../utils/analytics/consent'
import { resolveShopAnalytics } from '../utils/analytics/shop'
import { createShopifySubscriber } from '../utils/analytics/subscriber'
import defu from 'defu'

export default defineNuxtPlugin({
  name: 'shopify:analytics',

  async setup(nuxtApp) {
    const { _shopify } = useRuntimeConfig().public

    const analytics = _shopify?.analytics

    if (!analytics) return

    const host = analytics.domain || `${_shopify.name}.myshopify.com`

    const storefrontAccessToken = analytics.consent?.storefrontAccessToken
      || _shopify.clients.storefront?.publicAccessToken

    if (!storefrontAccessToken) return

    const emitter = createEmitter()
    const shop = ref<ShopAnalytics | null>(null)
    const cart = ref<ShopifyAnalyticsCart | null>(null)

    const privacy = setupCustomerPrivacy({
      checkoutDomain: analytics.consent?.checkoutDomain || host,
      storefrontAccessToken,
      withPrivacyBanner: analytics.consent?.withPrivacyBanner,
      country: analytics.consent?.country,
      locale: analytics.consent?.language || analytics.language,
    })

    const shopResolved = resolveShopAnalytics({
      shopId: analytics.shopId,
      currency: analytics.currency,
      language: analytics.language,
      storefrontId: analytics.storefrontId,
    }).then((resolved) => {
      if (resolved) shop.value = resolved
    })

    const ready = Promise.all([shopResolved, privacy.ready])

    const whenReady = (callback: () => void) => {
      void ready.then(callback)
    }

    createShopifySubscriber(emitter, {
      shop: () => shop.value,
      domain: host,
      canTrack: privacy.canTrack,
      whenReady,
    })

    void ready.then(() => {
      void nuxtApp.callHook('analytics:ready', { shop: shop.value })
    })

    const context: ShopifyAnalyticsContext = {
      shop,
      cart,
      setCart: value => (cart.value = value),
      canTrack: privacy.canTrack,
      setTrackingConsent: privacy.setTrackingConsent,

      publish: (event, payload) => {
        void nuxtApp.callHook('analytics:publish', { event, payload })
        emitter.emit(event, payload)
      },

      subscribe: emitter.on,
    }

    const shopifyContext = nuxtApp.$shopify as { analytics?: ShopifyAnalyticsContext } ?? {}

    shopifyContext.analytics = defu(context, shopifyContext.analytics)

    if (!nuxtApp.$shopify) nuxtApp.$shopify = shopifyContext
  },
})
