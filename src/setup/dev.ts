import type { Nuxt } from '@nuxt/schema'
import type { ConsolaOptions } from 'consola'

import { stat } from 'node:fs/promises'
import { createResolver } from '@nuxt/kit'
import defu from 'defu'

import { useLogger } from '../utils/log'

export default async function setupDevMode(nuxt: Nuxt, logOptions?: Partial<ConsolaOptions>) {
    const logger = useLogger(logOptions)

    const resolver = createResolver(import.meta.url)

    const sourceFiles = {
        admin: resolver.resolve('../../src/clients/admin.d.ts'),
        storefront: resolver.resolve('../../src/clients/storefront.d.ts'),
    }

    const sourceFilesExist = await Promise.all([
        stat(sourceFiles.admin).catch(() => false),
        stat(sourceFiles.storefront).catch(() => false),
    ]).then(results => results.every(result => result !== false))

    if (sourceFilesExist) {
        logger.info('Source files detected, enabling module aliases for development mode.')

        nuxt.options = defu(nuxt.options, {
            alias: {
                '@nuxtjs/shopify/storefront': sourceFiles.storefront,
                '@nuxtjs/shopify/admin': sourceFiles.admin,
            },

            nitro: {
                typescript: {
                    tsConfig: {
                        include: [
                            sourceFiles.storefront,
                            sourceFiles.admin,
                        ],
                    },
                },
            },
        })
    }
}
