import type { ConsentConfig, ConsentPreferences, ShopifyGlobal } from '@shopify/hydrogen'

import { ref } from 'vue'

import { createLogger } from '../log'
import { waitFor } from './helpers'

export type ConsentMode = NonNullable<ConsentConfig['mode']>

function getCustomerPrivacy(): ShopifyGlobal['customerPrivacy'] | null {
  const api = typeof window === 'undefined' ? undefined : window.Shopify?.customerPrivacy

  return api && 'setTrackingConsent' in api ? api : null
}

async function showBannerPreferences(enabled: boolean) {
  if (!enabled) {
    createLogger().debug('Cannot show the Shopify privacy banner preferences, `analytics.consent.mode` is not `default-banner`')

    return
  }

  const banner = await waitFor(() => window.privacyBanner ?? null)

  await banner?.showPreferences()
}

export function createCustomerPrivacy(mode: ConsentMode) {
  const trackingAllowed = ref(false)
  const bannerRequired = ref(false)

  let recordChoice = () => {}

  const choiceRecorded = new Promise<void>(resolve => (recordChoice = resolve))

  const sync = () => {
    const api = getCustomerPrivacy()

    trackingAllowed.value = api?.analyticsProcessingAllowed() ?? false
    bannerRequired.value = api?.shouldShowBanner() ?? false
  }

  const connect = () => {
    document.addEventListener('consentTrackingApiLoaded', sync)
    document.addEventListener('visitorConsentCollected', sync)

    sync()
  }

  const consent: ConsentConfig = mode === 'custom-banner'
    ? { mode, setup: () => choiceRecorded }
    : { mode }

  return {
    consent,

    connect,

    canTrack: () => trackingAllowed.value,

    shouldShowBanner: () => bannerRequired.value,

    setTrackingConsent: async (preferences: ConsentPreferences) => {
      if (typeof window === 'undefined') return

      const api = await waitFor(getCustomerPrivacy)

      if (!api) throw new Error('Shopify\'s Customer Privacy API did not load, so the consent was not recorded')

      await api.setTrackingConsent({ ...preferences })

      sync()
      recordChoice()
    },

    showPreferences: () => typeof window === 'undefined'
      ? Promise.resolve()
      : showBannerPreferences(mode === 'default-banner'),
  }
}
