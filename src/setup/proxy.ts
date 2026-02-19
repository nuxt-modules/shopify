import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import { registerProxy } from '../utils/proxy'
import { ShopifyClientType } from '../schemas'
import { upperFirst } from 'scule'

export default async function setupProxy(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const logger = useLogger(config)

    for (const clientType of Object.values(ShopifyClientType)) {
        const url = registerProxy(nuxt, config, clientType, resolver)

        if (url && nuxt.options.dev) {
            logger.info(`${upperFirst(clientType)} proxy available at: ${url}`)
        }
    }
}
