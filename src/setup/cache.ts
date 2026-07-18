import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addPlugin } from '@nuxt/kit'

import { useLogger } from '../utils/log'

export default function setupCache(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()
  const storefrontPluginPath = resolver.resolve('./runtime/plugins/cache/storefront')

  const storefrontStorageMount = typeof config.clients.storefront?.cache === 'object'
    ? typeof config.clients.storefront.cache.proxy === 'object'
      ? config.clients.storefront.cache.proxy
      : undefined
    : undefined

  if (storefrontStorageMount) {
    logger.debug('Mounting storefront proxy cache storage at `storefront-proxy`')

    nuxt.options.nitro.storage ??= {}
    nuxt.options.nitro.storage['storefront-proxy'] = storefrontStorageMount
  }

  if (config.clients.storefront?.cache !== false) {
    addPlugin(storefrontPluginPath)
  }
}
