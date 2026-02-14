import type { Nuxt } from '@nuxt/schema'
import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addPlugin } from '@nuxt/kit'

export default async function setupCache(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const pluginPath = resolver.resolve('./runtime/plugins/cache')

    addPlugin(pluginPath)
}
