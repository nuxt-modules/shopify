import type {
  ShopAnalytics,
  ShopifyAnalyticsCart,
  ShopifyAnalyticsContext,
} from '../../module'

import type { ShopifyScriptsI18n } from '@shopify/hydrogen'

import { getShopifyScriptTags, initializeShopifyScripts, trackCartAnalytics } from '@shopify/hydrogen'
import { ref } from 'vue'
import defu from 'defu'
import {
  defineNuxtPlugin,
  useHead,
  useRuntimeConfig,
} from '#imports'

import { createLogger } from '../utils/log'
import { createCartAnalyticsStore } from '../utils/analytics/cart'
import { getBus, publishToBus, subscribeToBus } from '../utils/analytics/bus'
import { canTrack, setTrackingConsent, showPreferences } from '../utils/analytics/privacy'
import { ensureTrackingValues } from '../utils/analytics/tracking'

const ANALYTICS_EVENTS = [
  'page_viewed',
  'product_viewed',
  'collection_viewed',
  'search_viewed',
  'cart_viewed',
  'cart_updated',
  'product_added_to_cart',
  'product_removed_from_cart',
] as const

export default defineNuxtPlugin({
  name: 'shopify:analytics',

  setup(nuxtApp) {
    const { _shopify } = useRuntimeConfig().public

    if (!_shopify) return

    const analytics = _shopify.analytics

    if (!analytics || !analytics.shopId) return

    const { shopId } = analytics

    const consent = { mode: analytics.consent?.banner ? 'default-banner' : 'no-banner' } as const

    const country = (analytics.country?.toUpperCase() || 'US') as ShopifyScriptsI18n['country']
    const language = (analytics.language?.toUpperCase() || 'EN') as ShopifyScriptsI18n['language']

    const tags = getShopifyScriptTags({
      consent,
      analytics: { channel: 'headless' },
      i18n: { country, language, currency: analytics.currency },
      shop: {
        shopId,
        storefrontId: analytics.storefrontId || '0',
        myshopifyDomain: `${_shopify.name}.myshopify.com`,
      },
    })

    useHead({
      link: tags.links.map((link, index) => ({ key: `shopify-link-${index}`, ...link.attributes })) as never,
      script: tags.scripts.map((script, index) => ({
        key: `shopify-script-${index}`,
        ...script.attributes,
        ...(script.innerHTML ? { innerHTML: script.innerHTML } : {}),
      })) as never,
    })

    const shop = ref<ShopAnalytics | null>({
      shopId,
      acceptedLanguage: language,
      currency: analytics.currency?.toUpperCase() || '',
      hydrogenSubchannelId: analytics.storefrontId || '0',
    })

    const cart = ref<ShopifyAnalyticsCart | null>(null)

    const context: ShopifyAnalyticsContext = {
      shop,
      cart,
      setCart: value => (cart.value = value),
      canTrack,
      setTrackingConsent,
      showPreferences,
      setShopContext: () => Promise.resolve(shop.value),

      publish: (event, payload) => publishToBus(event, payload, analytics.currency),

      subscribe: subscribeToBus,
    }

    if (import.meta.client) {
      nuxtApp.hook('app:mounted', () => {
        getBus()?.addDestination({
          name: 'nuxt-shopify:hook',
          setup: ({ subscribe }) => {
            const stops = ANALYTICS_EVENTS.map(event => subscribe(event, (payload) => {
              void Promise.resolve(nuxtApp.callHook('analytics:publish', { event, payload }))
                .catch(error => createLogger().debug('Analytics publish hook failed:', error))
            }))

            return () => stops.forEach(stop => stop())
          },
        })

        try {
          trackCartAnalytics(createCartAnalyticsStore(cart, analytics.currency?.toUpperCase()))
        }
        catch (error) {
          createLogger().debug('Cart analytics did not start:', error)
        }

        const trackingResolved = _shopify.clients.storefront?.proxy
          ? nuxtApp.runWithContext(ensureTrackingValues)
          : Promise.resolve()

        void trackingResolved
          .then(() => initializeShopifyScripts({ consent }))
          .then(() => nuxtApp.callHook('analytics:ready', { shop: shop.value }))
          .catch(error => createLogger().debug('Analytics initialization did not complete cleanly:', error))
      })
    }

    const shopifyContext = nuxtApp.$shopify as { analytics?: ShopifyAnalyticsContext } ?? {}

    shopifyContext.analytics = defu(context, shopifyContext.analytics)

    if (!nuxtApp.$shopify) nuxtApp.$shopify = shopifyContext
  },
})
