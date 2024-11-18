import type {
    ModuleOptions,
    ShopifyClientType,
} from './types'

import {
    createResolver,
    useLogger,
    defineNuxtModule,
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

                if (nuxt.options.dev && clientConfig.sandbox) {
                    const url = installApolloSandbox(
                        nuxt,
                        clientType,
                    )

                    logger.info(`Sandbox available at: ${url}`)
                }

                const functionName = `use${upperFirst(clientType)}`
                addServerImports([{
                    from: resolver.resolve(`./runtime/server/utils/${functionName}`),
                    name: functionName,
                }])
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            nuxt.options.runtimeConfig._shopify = config

            logger.success('Finished shopify setup')
        }
    },
})
