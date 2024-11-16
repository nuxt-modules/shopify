import type {
    ModuleOptions,
    ShopifyClientType,
} from './types'

import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule,
    updateTemplates,
} from '@nuxt/kit'

import {
    registerTemplates,
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
                filter: data => data.filename.endsWith('gql'),
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

            const resolver = createResolver(import.meta.url)
            const config = useShopifyConfig(options)

            addServerImportsDir(resolver.resolve('./runtime/server/utils'))

            for (const _clientType in config.clients) {
                const clientType = _clientType as ShopifyClientType
                const clientConfig = config.clients[clientType]

                if (!clientConfig) continue

                if (!clientConfig.skipCodegen) {
                    registerTemplates(nuxt, clientType, clientConfig)
                }
                else {
                    logger.info(`Skipping type generation for ${clientType}`)
                }

                if (clientConfig.sandbox) {
                    nuxt.hooks.hook('pages:extend', (pages) => {
                        pages.push({
                            name: `apollo-sandbox-${clientType}`,
                            file: resolver.resolve('./runtime/pages/apollo-sandbox.vue'),
                            path: `\/apollo-sandbox/${clientType}`,
                            meta: { clientType, clientConfig },
                        })
                    })

                    const url = new URL(nuxt.options.devServer.url).href
                        + 'apollo-sandbox/'
                        + clientType

                    logger.info(`Sandbox available at: ${url}`)
                }

                delete clientConfig.skipCodegen
                delete clientConfig.sandbox
                delete clientConfig.documents
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            nuxt.options.runtimeConfig._shopify = config

            logger.success('Finished shopify setup')
        }
    },
})
