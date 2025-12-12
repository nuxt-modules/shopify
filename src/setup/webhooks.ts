import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'

export async function setupWebhooks(nuxt: Nuxt, config: ShopifyConfig) {
    const logger = useLogger()

    console.log(config.webhooks)
}
