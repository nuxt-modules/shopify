import defu from 'defu'
import { createStorage } from 'unstorage'
import lruCacheDriver from '../../utils/lru-driver'

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
  name: 'shopify:cache:storefront',

  async setup(nuxtApp) {
    if (import.meta.server) return

    const { _shopify } = useRuntimeConfig().public

    const storefrontConfig = _shopify?.clients.storefront
    const storefrontCache = storefrontConfig?.cache && storefrontConfig.cache.client ? storefrontConfig.cache.client : undefined

    const config = typeof storefrontCache === 'object' ? storefrontCache : undefined

    const storage = createStorage({
      // Uses custom driver to allow setting TTL per entry
      // See https://github.com/unjs/unstorage/issues/466
      driver: lruCacheDriver({
        ...(config?.max ? { max: config?.max } : {}),
        ...(config?.maxSize ? { maxSize: config?.maxSize } : {}),
        ...(config?.maxEntrySize ? { maxEntrySize: config?.maxEntrySize } : {}),
        ...(config?.ttl ? { ttl: config?.ttl } : {}),
      }),
    })

    const shopifyContext = nuxtApp.$shopify as { cache?: { storefront?: typeof storage } } ?? {}

    shopifyContext.cache = defu({ storefront: storage }, shopifyContext.cache)

    if (!nuxtApp.$shopify) nuxtApp.$shopify = shopifyContext
  },
})
