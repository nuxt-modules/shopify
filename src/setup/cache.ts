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

  const storefrontCache = config.clients.storefront?.cache

  if (storefrontCache && storefrontCache.client) {
    addPlugin(storefrontPluginPath)
  }
  else {
    logger.debug('Skipping the storefront client cache plugin: `cache.client` is disabled')
  }
}
