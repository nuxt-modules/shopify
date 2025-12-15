import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addServerImports } from '@nuxt/kit'

export default async function setupWebhooks(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    addServerImports([
        {
            from: resolver.resolve('./runtime/server/utils/webhooks/handler'),
            name: 'defineWebhookEventHandler',
        },
        {
            from: resolver.resolve('./runtime/server/utils/webhooks/validation'),
            name: 'validate',
            as: 'validateWebhook',
        },
    ])
}
