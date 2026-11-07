import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addComponentsDir, addImports } from '@nuxt/kit'

import { registerShopifyRoutes } from '../utils/clients'
import { useLogger } from '../utils/log'

export default function setupAnalytics(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  if (!config.analytics) return

  const logger = useLogger()

  if (!config.storefrontId) {
    logger.debug('Analytics is enabled without a `storefrontId`, so events are attributed to the Headless channel')
  }

  if (!config.clients.storefront && (!config.shopId || !(config.defaultMarket?.country && config.defaultMarket.language))) {
    logger.warn('Analytics without the storefront client needs `shopId` and `defaultMarket`, because there is no client to look them up with')
  }

  registerShopifyRoutes(nuxt, config, resolver)

  addComponentsDir({
    path: resolver.resolve('./runtime/components/analytics'),
    pathPrefix: false,
    prefix: 'Shopify',
  })

  addImports([{
    from: resolver.resolve('./runtime/composables/analytics/client'),
    name: 'useShopifyAnalytics',
  }])

  logger.debug('Registered the analytics components and `useShopifyAnalytics` composable')
}
