import type { ModuleOptions } from './types'
import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import { generate } from '@graphql-codegen/cli'
import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule, useNuxt, addTypeTemplate, updateTemplates, addTemplate,
} from '@nuxt/kit'
import defu from 'defu'
import { basename, matchesGlob } from 'node:path'

import { useShopifyConfig } from './utils'

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
        },
        'prepare:types': async () => {
            const nuxt = useNuxt()
            const config = nuxt.options.runtimeConfig._shopify
            if (!config) return

            const files = defu(
                config.clients.storefront?.codegen ?? {},
                config.clients.admin?.codegen ?? {},
            )

            for (const [filename, config] of Object.entries(files)) {
                const getContents: NuxtTemplate['getContents'] = async () => {
                    const generates = {
                        [filename]: config,
                    }

                    await nuxt.callHook('shopify:codegen:generate', { nuxt, generates })

                    return generate({
                        cwd: nuxt.options.rootDir,
                        generates,
                    }, false).then(result => result)
                }

                let template = undefined
                if (filename.endsWith('.d.ts')) {
                    // @ts-expect-error - is valid by the condition
                    template = addTypeTemplate({ filename, getContents })
                }
                else {
                    template = addTemplate({ filename, getContents })
                }

                console.log(template)
            }
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
