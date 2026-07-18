import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addComponentsDir, addImports, addPlugin, addServerPlugin } from '@nuxt/kit'

import { ShopifyClientType } from '../schemas'
import { useLogger } from '../utils/log'

export default function setupAnalytics(config: ShopifyConfig, resolver: Resolver) {
  if (!config.analytics) return

  const logger = useLogger()

  if (!config.analytics.storefrontId) {
    logger.debug('Analytics is enabled but no `analytics.storefrontId` set. Events are attributed to the default storefront ("0").')
  }

  if (!config.clients[ShopifyClientType.Storefront]?.publicAccessToken && !config.analytics.consent?.storefrontAccessToken) {
    logger.error('Analytics is enabled but no public storefront access token is set. Set `clients.storefront.publicAccessToken` or `analytics.consent.storefrontAccessToken`. Disabling analytics.')
    return
  }

  if (!config.clients[ShopifyClientType.Storefront]?.proxy) {
    logger.warn('Analytics is enabled but the storefront proxy is disabled. Shopify only exposes visitor tracking identifiers on same-origin responses, so events will be reported without them.')
  }

  addServerPlugin(resolver.resolve('./runtime/server/plugins/tracking'))

  addPlugin({ src: resolver.resolve('./runtime/plugins/analytics'), mode: 'client' })

  addComponentsDir({
    path: resolver.resolve('./runtime/components/analytics'),
    pathPrefix: false,
    prefix: '',
  })

  addImports([{
    from: resolver.resolve('./runtime/composables/analytics/client'),
    name: 'useShopifyAnalytics',
  }])

  logger.debug('Registered analytics plugin, components and `useShopifyAnalytics` composable')
}
