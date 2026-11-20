import type { ShopifyDevtoolsAnalyticsEvent, ShopifyDevtoolsConsent } from '../utils/devtools'

import { AnalyticsEvent } from '@shopify/hydrogen'
import { defineNuxtPlugin } from '#imports'

import { DEVTOOLS_ANALYTICS_EVENT, DEVTOOLS_CONSENT_EVENT, DEVTOOLS_EVENT, toDevtoolsRequest } from '../utils/devtools'

export default defineNuxtPlugin({
  name: 'shopify:devtools:browser',

  setup(nuxtApp) {
    const send = (event: string, data: object) => import.meta.hot?.send(event, data)

    const sendConsent = () => {
      const customerPrivacy = window.Shopify?.customerPrivacy

      send(DEVTOOLS_CONSENT_EVENT, customerPrivacy?.consentStatus === 'loaded'
        ? {
          loaded: true,
          analytics: customerPrivacy.analyticsProcessingAllowed(),
          marketing: customerPrivacy.marketingAllowed(),
          preferences: customerPrivacy.preferencesProcessingAllowed(),
          saleOfData: customerPrivacy.saleOfDataAllowed(),
        } satisfies ShopifyDevtoolsConsent
        : { loaded: false } satisfies ShopifyDevtoolsConsent)
    }

    nuxtApp.hook('shopify:storefront:client:response', params => send(DEVTOOLS_EVENT, toDevtoolsRequest('storefront', 'browser', params, location.pathname + location.search)))
    nuxtApp.hook('shopify:customer-account:client:response', params => send(DEVTOOLS_EVENT, toDevtoolsRequest('customer-account', 'browser', params, location.pathname + location.search)))

    nuxtApp.hook('shopify:analytics:ready', () => {
      sendConsent()

      document.addEventListener('consentTrackingApiLoaded', sendConsent)
      document.addEventListener('visitorConsentCollected', sendConsent)

      window.Shopify?.analytics?.addDestination({
        name: 'nuxt-devtools',
        setup: ({ subscribe }) => {
          for (const event of Object.values(AnalyticsEvent)) {
            subscribe(event, (payload) => {
              const url = 'url' in payload && typeof payload.url === 'string' ? new URL(payload.url, location.href) : undefined

              send(DEVTOOLS_ANALYTICS_EVENT, { event, page: url ? url.pathname + url.search : undefined, payload, time: Date.now() } satisfies ShopifyDevtoolsAnalyticsEvent)
            })
          }
        },
      })
    })
  },
})
