import type { StorefrontAnalytics } from '@shopify/hydrogen'

/**
 * Provides the analytics bus that Shopify's scripts create in the browser.
 *
 * @returns the analytics bus, or `null` on the server and before Shopify's scripts have loaded
 */
export function useShopifyAnalytics(): StorefrontAnalytics | null {
  return import.meta.server ? null : window.Shopify?.analytics ?? null
}
