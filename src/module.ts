import type { ModuleOptions } from './types'
import type { Types } from '@graphql-codegen/plugin-helpers'

import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule, useNuxt, addTypeTemplate, updateTemplates,
} from '@nuxt/kit'
import { basename, matchesGlob } from 'node:path'

import { useCodegen, useShopifyConfig } from './utils'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    hooks: {
        'shopify:config': async ({ nuxt, config }) => {
            nuxt.options.runtimeConfig._shopify = config
        },
        'builder:watch': async (event, path) => {
            const nuxt = useNuxt()
            if (!nuxt.options.runtimeConfig._shopify) return

            await useCodegen({
                nuxt,
                config: nuxt.options.runtimeConfig._shopify,
            })

            await updateTemplates({
                filter: template => matchesGlob(template.filename),
            })
        },
        'prepare:types': async () => {
            const nuxt = useNuxt()

            if (!nuxt.options.runtimeConfig._shopify) return

            const results = await useCodegen<Types.FileOutput[]>({
                nuxt,
                config: nuxt.options.runtimeConfig._shopify,
            })

            const typeFiles = results.filter(f => f.filename.endsWith('.d.ts'))
            for (const { filename, content } of typeFiles) {
                const t = addTypeTemplate({
                    filename,
                    getContents: () => content,
                })
            }

            addTypeTemplate({
                filename: 'types/shopify/index.d.ts',
                getContents: () => results
                    .map(({ filename }) => basename(filename))
                    .join('\n'),
            })
        },
    },

    async setup(options, nuxt) {
        const logger = useLogger('nuxt-shopify')

        if (!options || Object.keys(options).length < 1) {
            logger.warn('No shopify configuration provided.')
        }
        else {
            logger.info('Starting shopify setup')

            const config = useShopifyConfig(options)

            addServerImportsDir(
                createResolver(import.meta.url).resolve('./runtime/server/utils'),
            )

            await nuxt.callHook('shopify:config', { nuxt, config })

            logger.success('Finished shopify setup')
        }
    },
})
