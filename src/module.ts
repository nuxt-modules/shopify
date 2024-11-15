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
    addTemplate, updateTemplates,
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
        'builder:watch': async (event, file) => {
            await updateTemplates({
                filter: (data) => data.filename.endsWith('gql')
            })
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
                if (client.skipCodegen) continue

                delete client.skipCodegen

                addTemplate<ShopifyTypeTemplateOptions>({
                    filename: `schema/${clientType}.schema.json`,
                    getContents: generateIntrospection,
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig: client,
                    },
                    write: true,
                })

                addTypeTemplate<ShopifyTypeTemplateOptions>({
                    filename: `types/${clientType}.types.d.ts`,
                    getContents: generateTypes,
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig: client,
                    },
                })

                addTypeTemplate<ShopifyTypeTemplateOptions>({
                    filename: `types/${clientType}.operations.d.ts`,
                    getContents: generateOperations,
                    options: {
                        clientType: clientType as ShopifyClientType,
                        clientConfig: client,
                    },
                })
            }

            logger.success('Finished shopify setup')
        }
    },
})
