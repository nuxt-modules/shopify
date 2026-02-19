import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addPlugin } from '@nuxt/kit'

export default async function setupCache(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const storefrontPluginPath = resolver.resolve('./runtime/plugins/cache/storefront')

    const storefrontStorageMount = typeof config.clients.storefront?.cache === 'object'
        ? typeof config.clients.storefront.cache.proxy === 'object'
            ? config.clients.storefront.cache.proxy
            : undefined
        : undefined

    if (config.clients.storefront?.cache !== false) {
        addPlugin(storefrontPluginPath)
    }

    if (storefrontStorageMount) {
        nuxt.options.nitro.storage ??= {}
        nuxt.options.nitro.storage['storefront-proxy'] = storefrontStorageMount
    }
}
