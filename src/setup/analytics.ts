import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addComponentsDir, addImports, addPlugin } from '@nuxt/kit'

import { ShopifyClientType } from '../schemas'
import { useLogger } from '../utils/log'

export default async function setupAnalytics(_nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  if (!config.analytics) return

  const logger = useLogger()

  if (!config.analytics.storefrontId) {
    logger.debug('Analytics is enabled but no `analytics.storefrontId` set. Events are attributed to the default storefront ("0").')
  }

  if (!config.clients[ShopifyClientType.Storefront]?.publicAccessToken && !config.analytics.consent?.storefrontAccessToken) {
    logger.error('Analytics is enabled but no public storefront access token is set. Set `clients.storefront.publicAccessToken` or `analytics.consent.storefrontAccessToken`. Disabling analytics.')
    return
  }

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
