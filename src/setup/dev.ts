import type { Nuxt } from '@nuxt/schema'
import type { ConsolaOptions } from 'consola'

import { createResolver } from '@nuxt/kit'
import defu from 'defu'

import { useLogger } from '../utils/log'

export default function setupDevMode(nuxt: Nuxt, logOptions?: Partial<ConsolaOptions>) {
    const logger = useLogger(logOptions)

    logger.info('Development mode enabled: including source files')

    const resolver = createResolver(import.meta.url)

    nuxt.options = defu(nuxt.options, {
        alias: {
            '@nuxtjs/shopify/storefront': resolver.resolve('../types/clients/storefront.d.ts'),
            '@nuxtjs/shopify/admin': resolver.resolve('../types/clients/admin.d.ts'),
        },

        nitro: {
            typescript: {
                tsConfig: {
                    include: [
                        resolver.resolve('../types/clients/storefront.d.ts'),
                        resolver.resolve('../types/clients/admin.d.ts'),
                    ],
                },
            },
        },
    })
}
