import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type {
    ShopifyClientType,
    ShopifyConfig,
} from '../types'

import { addServerHandler } from '@nuxt/kit'
import { joinURL } from 'ufo'

import { useLogger } from './log'
import { upperFirst } from 'scule'

export function registerProxy(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType, resolver: Resolver): string | false {
    const clientConfig = config.clients[clientType]

    if (!clientConfig) return false

    const url = 'proxy' in clientConfig ? clientConfig.proxy : undefined

    if (!url) return false

    if (!nuxt.options.ssr) {
        const logger = useLogger(config.logger)

        logger.warn(`Server-side request proxying is only available in SSR mode, skipping ${upperFirst(clientType)} proxy setup.`)
    }

    addServerHandler({
        handler: resolver.resolve(`./runtime/server/api/proxy/${clientType}`),
        route: url,
    })

    return joinURL(nuxt.options.devServer.url, url)
}
