import { createStorage } from 'unstorage'
import lruCacheDriver from '../../utils/lru-driver'

import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
  name: 'shopify:storefront:cache',

  async setup(nuxtApp) {
    const { _shopify } = useRuntimeConfig().public

    const storefrontCache = _shopify?.clients.storefront?.cache

    if (!storefrontCache || !storefrontCache.browser) return

    const config = typeof storefrontCache.browser === 'object' ? storefrontCache.browser : undefined

    const storage = createStorage({
      driver: lruCacheDriver({
        ...(config?.max ? { max: config?.max } : {}),
        ...(config?.maxSize ? { maxSize: config?.maxSize } : {}),
        ...(config?.maxEntrySize ? { maxEntrySize: config?.maxEntrySize } : {}),
        ...(config?.ttl ? { ttl: config?.ttl } : {}),
      }),
    })

    nuxtApp.$shopify = { cache: { storefront: storage } }
  },
})
