import type {
    ModuleOptions,
    ShopifyClientType,
} from './types'

import {
    createResolver,
    useLogger,
    defineNuxtModule,
    updateTemplates,
    addServerImports,
} from '@nuxt/kit'
import { upperFirst } from 'scule'

import {
    installApolloSandbox,
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
            // TODO: Add filter to only update templates for the current client
            await updateTemplates({
                filter: template => template.filename.endsWith('.operations.d.ts'),
            })
        },
        'app:templatesGenerated': async (nuxt, templates, options) => {

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
                    const url = installApolloSandbox(
                        nuxt,
                        clientType,
                        clientConfig,
                        resolver.resolve('./runtime/pages/apollo-sandbox.vue'),
                    )

                    logger.info(`Sandbox available at: ${url}`)
                }

                // Remove custom config, to get a clean config for the clients
                // TODO Rethink application flow / types
                delete clientConfig.skipCodegen
                delete clientConfig.sandbox
                delete clientConfig.documents

                const functionName = `use${upperFirst(clientType)}`
                addServerImports([{
                    from: resolver.resolve(`./runtime/server/utils/use${functionName}`),
                    name: `use${functionName}`,
                }])
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            nuxt.options.runtimeConfig._shopify = config

            logger.success('Finished shopify setup')
        }
    },
})
