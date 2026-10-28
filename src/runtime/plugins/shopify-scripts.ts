import type { ShopifyAnalyticsShopContext } from '../../module'
import type { ShopifyScriptsShopContext } from '../utils/analytics/shop'

import { AnalyticsEvent, getShopifyScriptTags, initializeShopifyScripts, trackCartAnalytics } from '@shopify/hydrogen'
import { defineNuxtPlugin, useHead, useNuxtApp, useRouter, useRuntimeConfig, useState } from '#imports'

import { useStorefront } from '../composables/storefront/client'
import { createLogger } from '../utils/log'
import { createCartAnalyticsStore } from '../utils/analytics/cart'
import { createCustomerPrivacy } from '../utils/analytics/consent'
import { provideAnalytics } from '../utils/analytics/context'
import { waitFor } from '../utils/analytics/helpers'
import { trackPageViews } from '../utils/analytics/page-view'
import { applyMarket, createNavigation, toScriptsHead, toScriptsOptions } from '../utils/analytics/scripts'
import { createShopResolver } from '../utils/analytics/shop'
import { createStorefrontClient } from '../utils/clients/storefront'

let resolveServerShop: ReturnType<typeof createShopResolver> | undefined

export default defineNuxtPlugin({
  name: 'shopify:scripts',

  setup() {
    const nuxtApp = useNuxtApp()

    const { _shopify } = useRuntimeConfig().public

    const analytics = _shopify?.analytics

    if (!analytics) return

    const resolveShop = import.meta.server
      ? (resolveServerShop ??= createShopResolver(_shopify.name, analytics, createStorefrontClient<true>(_shopify)))
      : createShopResolver(_shopify.name, analytics, useStorefront())

    const scripts = useState<ShopifyScriptsShopContext | null>('shopify-analytics', () => null)

    const { consent, connect, ...consentActions } = createCustomerPrivacy(analytics.consent.mode)

    let head: ReturnType<typeof useHead> | undefined

    const renderScripts = (resolved: ShopifyScriptsShopContext) => {
      const input = toScriptsHead(getShopifyScriptTags(toScriptsOptions(resolved, analytics, consent)))

      if (head) head.patch(input)
      else head = useHead(input, { nuxt: nuxtApp })
    }

    const defaultShopResolved = scripts.value
      ? Promise.resolve()
      : resolveShop().then((resolved) => {
          scripts.value = resolved

          if (resolved) renderScripts(resolved)
        })

    const setShopContext = (context: ShopifyAnalyticsShopContext) =>
      Promise.all([defaultShopResolved, resolveShop(context)]).then(([, resolved]) => {
        if (!scripts.value || !resolved?.i18n) return null

        scripts.value = { ...scripts.value, i18n: resolved.i18n }

        if (import.meta.server) renderScripts(scripts.value)
        else applyMarket(resolved.i18n)

        return resolved.i18n
      })

    if (import.meta.server) {
      provideAnalytics({ scripts, ...consentActions, setShopContext })

      return defaultShopResolved
    }

    const router = useRouter()
    const navigate = createNavigation(router)

    const mounted = new Promise<void>(resolve => nuxtApp.hook('app:mounted', () => resolve()))

    void mounted.then(connect)

    const ready = Promise.all([mounted, defaultShopResolved])
      .then(() => scripts.value ? waitFor(() => window.Shopify?.analytics ?? null) : null)
      .then((bus) => {
        if (bus) {
          void initializeShopifyScripts({ consent, navigate })
            .catch(error => createLogger().debug('Shopify scripts did not start cleanly:', error))
        }

        return bus
      })

    const { context, whenReady } = provideAnalytics({ scripts, ready, ...consentActions, setShopContext })

    whenReady((bus) => {
      if (scripts.value) void nuxtApp.callHook('analytics:ready', scripts.value)

      if (analytics.autoPageView) trackPageViews(router, () => bus.publish(AnalyticsEvent.PAGE_VIEWED))

      trackCartAnalytics(createCartAnalyticsStore(context.cart))
    })
  },
})
