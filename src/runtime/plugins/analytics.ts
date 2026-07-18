import type {
  ShopAnalytics,
  ShopifyAnalyticsCart,
  ShopifyAnalyticsContext,
} from '../../module'

import { ref, watch } from 'vue'
import defu from 'defu'
import {
  defineNuxtPlugin,
  useRouter,
  useRuntimeConfig,
} from '#imports'

import { createLogger } from '../utils/log'
import { createCartTracker } from '../utils/analytics/cart'
import { createEmitter } from '../utils/analytics/emitter'
import { clearTrackingTokens } from '../utils/analytics/cookies'
import { setupCustomerPrivacy } from '../utils/analytics/consent'
import { createPageViewTracker } from '../utils/analytics/page-view'
import { resolveShopAnalytics } from '../utils/analytics/shop'
import { createShopifySubscriber } from '../utils/analytics/subscriber'
import { ensureTrackingValues } from '../utils/analytics/tracking'

export default defineNuxtPlugin({
  name: 'shopify:analytics',

  async setup(nuxtApp) {
    const { _shopify } = useRuntimeConfig().public

    const analytics = _shopify?.analytics

    if (!analytics) return

    const host = analytics.domain || `${_shopify.name}.myshopify.com`

    const storefrontAccessToken = analytics.consent?.storefrontAccessToken
      || _shopify.clients.storefront?.publicAccessToken

    if (!storefrontAccessToken) {
      createLogger().warn('Analytics is enabled but no public storefront access token is available at runtime. Analytics will not be initialized')

      return
    }

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

    const trackingResolved = _shopify.clients.storefront?.proxy
      ? ensureTrackingValues()
      : Promise.resolve()

    const ready = Promise.all([shopResolved, privacy.ready, trackingResolved])

    const whenReady = (callback: () => void) => {
      void ready.then(callback)
    }

    createShopifySubscriber(emitter, {
      shop: () => shop.value,
      domain: host,
      cookieDomain: privacy.cookieDomain,
      canTrack: privacy.canTrack,
      getConsent: privacy.getConsent,
      whenReady,
    })

    const dropTokensWithoutConsent = () => {
      if (!privacy.canTrack()) clearTrackingTokens(privacy.cookieDomain)
    }

    document.addEventListener('visitorConsentCollected', dropTokensWithoutConsent)

    void ready.then(() => {
      if (!analytics.consent?.withPrivacyBanner) dropTokensWithoutConsent()

      createLogger().debug('Analytics initialized:', shop.value)

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

    watch(cart, createCartTracker({ publish: context.publish }))

    if (analytics.autoPageView) {
      const trackPageView = createPageViewTracker({
        router: useRouter(),
        shop: () => shop.value,
        publish: url => context.publish('page_viewed', { url }),
      })

      whenReady(trackPageView)
    }

    const shopifyContext = nuxtApp.$shopify as { analytics?: ShopifyAnalyticsContext } ?? {}

    shopifyContext.analytics = defu(context, shopifyContext.analytics)

    if (!nuxtApp.$shopify) nuxtApp.$shopify = shopifyContext
  },
})
