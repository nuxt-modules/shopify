import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import {
    registerProxy,
    shouldEnableProxy,
} from '../utils/proxy'
import { ShopifyClientType } from '../schemas'
import { upperFirst } from 'scule'

export default async function setupProxy(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const logger = useLogger()

    if (!shouldEnableProxy(nuxt, config)) {
        const storefrontConfig = config.clients.storefront

        if (storefrontConfig?.proxy && !nuxt.options.ssr) {
            logger.info('Server-side request proxying is only available in SSR mode, skipping proxy setup.')
        }

        return
    }

    for (const clientType of Object.values(ShopifyClientType)) {
        if (clientType !== ShopifyClientType.Storefront) continue

        const url = registerProxy(nuxt, config, clientType, resolver)

        if (url && nuxt.options.dev) {
            logger.info(`${upperFirst(clientType)} proxy available at: ${url}`)
        }
    }
}
