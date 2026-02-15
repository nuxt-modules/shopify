import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addPlugin } from '@nuxt/kit'

export default async function setupCache(config: ShopifyConfig, resolver: Resolver) {
    const storefrontPluginPath = resolver.resolve('./runtime/plugins/cache/storefront')

    if (config.clients.storefront?.cache !== false) {
        addPlugin(storefrontPluginPath)
    }
}
