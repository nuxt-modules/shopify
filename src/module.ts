import type {
    ModuleOptions,
    ShopifyClientType,
} from './types'

import {
    createResolver,
    defineNuxtModule,
    addServerImports,
    updateRuntimeConfig,
} from '@nuxt/kit'
import { upperFirst } from 'scule'

import {
    installSandbox,
    registerTemplates,
    useShopifyConfig,
    useShopifyConfigSchema,
} from './utils'
import { useLog } from './utils/log'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@konkonam/nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    async setup(options, nuxt) {
        const log = useLog(options.logger)

        const moduleOptions = useShopifyConfigSchema(options)

        if (!moduleOptions.success) {
            log.info('Skipping setup: config not provided or invalid')
            log.debug(`See module configuration reference: https://konkonam.github.io/nuxt-shopify/configuration/module`)
            log.debug(`Error while parsing module options:\n${moduleOptions.error}`)
        }
        else {
            log.start('Starting setup')

            const resolver = createResolver(import.meta.url)
            const config = useShopifyConfig(moduleOptions.data)

            for (const _clientType in config.clients) {
                const clientType = _clientType as ShopifyClientType
                const clientConfig = config.clients[clientType]

                if (!clientConfig) continue

                if (!clientConfig.skipCodegen) {
                    registerTemplates(nuxt, clientType, clientConfig)
                }
                else {
                    log.info(`Skipping type generation for ${clientType}`)
                }

                if (nuxt.options.dev && clientConfig.sandbox) {
                    const url = installSandbox(nuxt, clientType)

                    log.info(`Sandbox available at: ${url}`)
                }

                const functionName = `use${upperFirst(clientType)}`
                addServerImports([{
                    from: resolver.resolve(`./runtime/server/utils/${functionName}`),
                    name: functionName,
                }])
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            updateRuntimeConfig({
                _shopify: config,
            })

            log.success('Finished setup')
        }
    },
})
