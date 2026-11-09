import type { ConsentConfig } from '@shopify/hydrogen'

import type { ShopifyScriptsShopContext } from '../../module'

import { AnalyticsEvent, configureLogging, getShopifyScriptTags, initializeShopifyScripts } from '@shopify/hydrogen'
import { defineNuxtPlugin, useHead, useNuxtApp, useRequestEvent, useRouter, useRuntimeConfig, useState } from '#imports'

import { useStorefront } from '../composables/storefront/client'
import { createLogger } from '../utils/log'
import { trackPageViews } from '../utils/analytics/page-view'
import { createNavigation, toScriptsHead, toScriptsOptions } from '../utils/scripts'
import { createShopResolver } from '../utils/shop'

type ConsentMode = NonNullable<ConsentConfig['mode']>

function waitFor<T>(getter: () => T | null, timeoutMs = 8000): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = getter()

    if (existing) {
      resolve(existing)
      return
    }

    const start = Date.now()

    const interval = setInterval(() => {
      const value = getter()

      if (value || Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(value)
      }
    }, 50)
  })
}

function hasCollectedConsent(): boolean {
  return Object.values(window.Shopify?.customerPrivacy?.currentVisitorConsent() ?? {}).some(Boolean)
}

function createConsent(mode: ConsentMode): ConsentConfig {
  if (mode !== 'custom-banner') return { mode }

  return {
    mode,
    setup: () => hasCollectedConsent()
      ? Promise.resolve()
      : new Promise<void>(resolve => document.addEventListener('visitorConsentCollected', () => resolve(), { once: true })),
  }
}

export default defineNuxtPlugin({
  name: 'shopify:scripts',

  async setup() {
    const nuxtApp = useNuxtApp()

    const { _shopify } = useRuntimeConfig().public

    if (!_shopify) return

    if (import.meta.client && _shopify.logger) configureLogging({ logger: createLogger().withTag('hydrogen'), level: 'trace' })

    const analytics = _shopify.analytics || undefined

    const consent = createConsent(analytics?.consent.mode ?? 'no-banner')

    const scripts = useState<ShopifyScriptsShopContext | null>('shopify-scripts', () => null)

    const render = (resolved: ShopifyScriptsShopContext) => useHead(toScriptsHead(getShopifyScriptTags(toScriptsOptions(resolved, _shopify.storefrontId, consent))), { nuxt: nuxtApp })

    if (import.meta.server) {
      const event = useRequestEvent()

      scripts.value = event?.context._shopify?.scripts ? await event.context._shopify.scripts(event) : null

      if (scripts.value) render(scripts.value)

      return
    }

    const lookUpClient = _shopify.clients.storefront ? () => nuxtApp.runWithContext(() => useStorefront()) : undefined

    const resolved = scripts.value
      ? Promise.resolve(scripts.value)
      : createShopResolver(_shopify, lookUpClient)().then((context) => {
          scripts.value = context

          render(context)

          return context
        })

    const router = useRouter()

    nuxtApp.hook('app:mounted', async () => {
      const context = await resolved

      const bus = context && await waitFor(() => window.Shopify?.analytics ?? null)

      if (!context || !bus) return

      void initializeShopifyScripts({ consent, navigate: createNavigation(router), routes: _shopify.routeTemplates })
        .catch(error => createLogger().debug('Shopify scripts did not start cleanly:', error))

      if (!analytics) return

      void nuxtApp.callHook('shopify:analytics:ready', context)

      if (analytics.autoPageView) trackPageViews(router, () => bus.publish(AnalyticsEvent.PAGE_VIEWED))
    })
  },
})
