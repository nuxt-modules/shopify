import { useStorefront } from '../../composables/storefront/client'
import { createLogger } from '../log'

const ENSURE_COOKIES_QUERY = `#graphql
  query EnsureShopifyCookies {
    consentManagement {
      cookies(visitorConsent: {}) {
        cookieDomain
      }
    }
  }
`

const SERVER_TRACKING_KEY = '_server_tracking'

function hasServerResolvedTracking(): boolean {
  try {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

    return !!navigation?.serverTiming?.some(entry => entry.name === SERVER_TRACKING_KEY)
  }
  catch {
    return false
  }
}

let pending: Promise<void> | undefined

export function ensureTrackingValues(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  if (hasServerResolvedTracking()) return Promise.resolve()

  pending ??= useStorefront()
    .request(ENSURE_COOKIES_QUERY, {
      headers: { 'X-Shopify-Proxy-Api-Version': 'unstable' },
    })
    .then(() => undefined)
    .catch((error) => {
      createLogger().debug('Failed to resolve Shopify tracking values:', error)
    })

  return pending
}
