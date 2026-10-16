import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addComponentsDir, addImports, addPlugin, addServerHandler, addServerPlugin } from '@nuxt/kit'

import { ShopifyClientType } from '../schemas'
import { useLogger } from '../utils/log'

export default function setupAnalytics(config: ShopifyConfig, resolver: Resolver) {
  if (!config.analytics) return

  const logger = useLogger()

  if (!config.analytics.storefrontId) {
    logger.debug('Analytics is enabled but no `analytics.storefrontId` set. Events are attributed to the default storefront ("0").')
  }

  if (!config.clients[ShopifyClientType.Storefront]?.proxy) {
    logger.warn('The storefront proxy is disabled, so Shopify cannot expose visitor tracking identifiers. Analytics events will be reported without them')
  }

  addServerPlugin(resolver.resolve('./runtime/server/plugins/tracking'))

  if (config.clients[ShopifyClientType.Storefront]?.publicAccessToken) {
    addServerHandler({
      route: '/api/:version/graphql.json',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/storefront-graphql'),
    })
  }
  else {
    logger.warn('Shopify\'s consent scripts need `clients.storefront.publicAccessToken` to sync visitor consent. Analytics events will stay blocked')
  }

  addPlugin({ src: resolver.resolve('./runtime/plugins/analytics') })

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
