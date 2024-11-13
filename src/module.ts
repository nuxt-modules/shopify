import type { ModuleOptions } from './types'
import type { NuxtTemplate } from '@nuxt/schema'

import { type CodegenConfig, generate } from '@graphql-codegen/cli'
import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule, useNuxt, addTypeTemplate, updateTemplates, addTemplate,
} from '@nuxt/kit'
import { preset } from '@shopify/api-codegen-preset'
import defu from 'defu'
import { join } from 'node:path'

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
                    const generates: CodegenConfig['generates'] = { [filename]: config }

                    await nuxt.callHook('shopify:codegen:generate', { nuxt, generates })

                    return await generate({
                        cwd: nuxt.options.rootDir,
                        generates,
                    }, false).then(result => result.content)
                }

                if (filename.endsWith('.d.ts')) {
                    addTypeTemplate({
                        // @ts-expect-error - is valid by the condition
                        filename: join('types/shopify', filename),
                        getContents,
                    })
                }
                else if (filename.endsWith('.json')) {
                    addTemplate({
                        filename: join('schema', filename),
                        getContents,
                    })
                }
                else {
                    addTemplate({ filename, getContents })
                }
            }
        },
        'shopify:codegen:generate': async ({ nuxt, generates }) => {
            if (generates)
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

            await updateTemplates({
                filter: () => true,
            })

            console.log(nuxt.options.runtimeConfig?._shopify?.clients?.storefront?.codegen)

            const a = addTemplate({ filename: 'test.ts', getContents: () => 'abc' })
            console.log(a)

            logger.success('Finished shopify setup')
        }
    },
})
