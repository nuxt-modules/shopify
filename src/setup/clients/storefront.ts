import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../../types'

import { addPlugin, addServerHandler } from '@nuxt/kit'

import { ShopifyClientType } from '../../schemas'
import {
  getPresetBuyerIpHeader,
  isPublicClient,
  registerClientAsyncImports,
  registerClientImports,
  registerClientServerImports,
  registerShopifyRoutes,
} from '../../utils/clients'
import { useLogger } from '../../utils/log'
import { registerStorageMount } from '../../utils/storage'

export default function setupStorefrontClient(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const storefront = config.clients[ShopifyClientType.Storefront]

  if (!storefront) return

  const logger = useLogger()

  registerClientServerImports(ShopifyClientType.Storefront, resolver)
  registerShopifyRoutes(nuxt, config, resolver)

  nuxt.hook('nitro:init', (nitro) => {
    const buyerIpHeader = getPresetBuyerIpHeader(nitro.options.preset)

    if (!buyerIpHeader) return

    const runtimeConfig = nitro.options.runtimeConfig as { shopify?: ShopifyConfig, _shopify?: ShopifyConfig }

    for (const moduleConfig of [runtimeConfig.shopify, runtimeConfig._shopify]) {
      const storefrontConfig = moduleConfig?.clients?.[ShopifyClientType.Storefront]

      if (storefrontConfig && !storefrontConfig.buyerIpHeader) storefrontConfig.buyerIpHeader = buyerIpHeader
    }
  })

  if (isPublicClient(storefront)) {
    registerClientImports(ShopifyClientType.Storefront, resolver)
    registerClientAsyncImports(nuxt, ShopifyClientType.Storefront, resolver)
  }

  const cache = isPublicClient(storefront) && typeof storefront.cache === 'object' ? storefront.cache : undefined

  registerStorageMount(nuxt, 'storefront-cache', cache?.server)

  if (cache?.server) {
    addServerHandler({ middleware: true, handler: resolver.resolve('./runtime/server/middleware/storefront/cache') })
  }

  if (cache?.browser) {
    addPlugin({ src: resolver.resolve('./runtime/plugins/storefront/cache'), mode: 'client' })
  }
  else {
    logger.debug('Skipping the storefront client cache plugin: the client has no public access token or `cache.browser` is disabled')
  }
}
