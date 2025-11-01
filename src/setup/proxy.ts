import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import type { Nuxt } from '@nuxt/schema'

import { useLogger } from '../utils/log'
import {
    registerProxy,
    shouldEnableProxy,
} from '../utils/proxy'

export default async function setupProxy(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const logger = useLogger()

    if (!shouldEnableProxy(nuxt, config)) {
        const storefrontConfig = config.clients.storefront

        if (storefrontConfig?.proxy && !nuxt.options.ssr) {
            logger.info('Server-side request proxying is only available in SSR mode, skipping proxy setup.')
        }

        return
    }

    const url = registerProxy(nuxt, config, resolver)

    if (url && nuxt.options.dev) {
        logger.info(`Storefront proxy available at: ${url}`)
    }
}
