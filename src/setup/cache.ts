import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

export default async function setupCache(nuxt: Nuxt, config: ShopifyConfig) {
    console.log(nuxt, config)
}
