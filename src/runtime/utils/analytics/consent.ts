import type { CustomerPrivacyApi, PrivacyBanner, TrackingConsent } from '../../../module'

import { useHead } from '#imports'

import { createLogger } from '../log'
import { waitFor, windowRef } from './helpers'

const CONSENT_API = 'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js'
const CONSENT_API_WITH_BANNER = 'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js'
const SCRIPT_ID = 'customer-privacy-api'

function getPrivacyWindow() {
  return windowRef<{ Shopify?: { customerPrivacy?: CustomerPrivacyApi }, privacyBanner?: PrivacyBanner }>()
}

export function parseStoreDomain(checkoutDomain: string): string | undefined {
  if (typeof window === 'undefined') return undefined

  const current = window.location.host.split('.').reverse()
  const checkout = checkoutDomain.split('.').reverse()
  const shared: string[] = []

  for (const [index, part] of checkout.entries()) {
    if (part !== current[index]) break

    shared.push(part)
  }

  return shared.length > 1 ? shared.reverse().join('.') : undefined
}

function getCustomerPrivacy(): CustomerPrivacyApi | null {
  try {
    const api = getPrivacyWindow().Shopify?.customerPrivacy

    return api && 'setTrackingConsent' in api ? api : null
  }
  catch {
    return null
  }
}

export function setupCustomerPrivacy(config: {
  checkoutDomain: string
  storefrontAccessToken: string
  withPrivacyBanner?: boolean
  country?: string
  locale?: string
}) {
  const ancestorDomain = parseStoreDomain(config.checkoutDomain)

  const consentConfig = {
    checkoutRootDomain: config.checkoutDomain,
    storefrontRootDomain: ancestorDomain ? `.${ancestorDomain}` : undefined,
    storefrontAccessToken: config.storefrontAccessToken,
    headlessStorefront: true,
  }

  const bannerConfig = {
    ...consentConfig,
    country: config.country,
    locale: config.locale,
  }

  useHead({
    script: [{
      key: SCRIPT_ID,
      src: config.withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API,
      async: true,
    }],
  })

  const ready = waitFor(getCustomerPrivacy).then((api) => {
    if (api && config.withPrivacyBanner) {
      void waitFor(() => getPrivacyWindow().privacyBanner ?? null)
        .then(banner => banner?.loadBanner(bannerConfig))
        .catch(error => createLogger().debug('Failed to load the Shopify privacy banner:', error))
    }
  })

  return {
    ready,

    cookieDomain: ancestorDomain ? `.${ancestorDomain}` : undefined,

    canTrack: () => getCustomerPrivacy()?.analyticsProcessingAllowed() ?? false,

    getConsent: () => {
      const api = getCustomerPrivacy()

      const analyticsAllowed = api?.analyticsProcessingAllowed() ?? false
      const marketingAllowed = api?.marketingAllowed() ?? false
      const saleOfDataAllowed = api?.saleOfDataAllowed() ?? false

      return {
        analyticsAllowed,
        marketingAllowed,
        saleOfDataAllowed,
        ccpaEnforced: !saleOfDataAllowed,
        gdprEnforced: !(marketingAllowed && analyticsAllowed),
      }
    },

    setTrackingConsent: (consent: TrackingConsent, callback?: (result: { error?: string }) => void) => {
      getCustomerPrivacy()?.setTrackingConsent({ ...consentConfig, ...consent }, callback)
    },
  }
}
