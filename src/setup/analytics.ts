import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addComponentsDir, addImports, addPlugin, addServerHandler } from '@nuxt/kit'

import { useLogger } from '../utils/log'

export default function setupAnalytics(config: ShopifyConfig, resolver: Resolver) {
  if (!config.analytics) return

  const logger = useLogger()

  if (!config.analytics.storefrontId) {
    logger.debug('Analytics is enabled but no `analytics.storefrontId` set. Events are attributed to the Headless channel.')
  }

  addServerHandler({ middleware: true, handler: resolver.resolve('./runtime/server/middleware/shopify-routes') })

  addPlugin(resolver.resolve('./runtime/plugins/shopify-scripts'))

  addComponentsDir({
    path: resolver.resolve('./runtime/components/analytics'),
    pathPrefix: false,
    prefix: '',
  })

  addImports([{
    from: resolver.resolve('./runtime/composables/analytics/client'),
    name: 'useShopifyAnalytics',
  }])

  logger.debug('Registered Shopify\'s scripts, the analytics components and `useShopifyAnalytics` composable')
}
