import type {
    ModuleOptions,
    ShopifyClientConfig,
    ShopifyClientType,
    ShopifyTypeTemplateOptions,
} from './types'

import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule,
    addTypeTemplate,
    addTemplate,
} from '@nuxt/kit'

import {
    generateIntrospection,
    generateOperations,
    generateTypes,
    useShopifyConfig,
} from './utils'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    hooks: {
        'prepare:types': ({}) => {

        }
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

            nuxt.options.runtimeConfig._shopify = config

            for (const [clientType, client] of Object.entries<ShopifyClientConfig>(config.clients)) {
                const { skipCodegen, ...clientConfig } = client

                if (skipCodegen) continue

                const template = addTemplate<ShopifyTypeTemplateOptions>({
                    filename: `schemas/${clientType}.introspection.json`,
                    getContents: async (data) => {
                        const introspection = await generateIntrospection(data)

                        return introspection
                    },
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig,
                    },
                })

                addTypeTemplate<ShopifyTypeTemplateOptions>({
                    filename: `types/${clientType}.types.d.ts`,
                    getContents: generateTypes,
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig,
                    },
                })

                addTypeTemplate<ShopifyTypeTemplateOptions>({
                    filename: `types/${clientType}.operations.d.ts`,
                    getContents: generateOperations,
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig,
                    },
                })
            }

            logger.success('Finished shopify setup')
        }
    },
})
