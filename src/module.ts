import type { ModuleOptions } from './types'
import type { ShopifyClientType } from './utils'

import {
    createResolver,
    defineNuxtModule,
    useRuntimeConfig,
    updateRuntimeConfig,
} from '@nuxt/kit'
import { defu } from 'defu'

import {
    registerAutoImports,
    registerVirtualModuleTemplates,
    useLog,
    useShopifyConfig,
    useShopifyConfigValidation,
    setupClient,
} from './utils'

const ROLLUP_REPLACE_VIRTUAL_MODULES = true

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    async setup(options, nuxt) {
        const runtimeConfig = useRuntimeConfig()
        const log = useLog(options.logger)

        const moduleOptions = useShopifyConfigValidation(defu(
            runtimeConfig.public.shopify,
            runtimeConfig.shopify,
            options,
        ))

        const resolver = createResolver(import.meta.url)

        if (moduleOptions.success) {
            log.start('Starting setup')

            const { config, publicConfig } = useShopifyConfig(moduleOptions.data)

            for (const _clientType in config.clients) {
                const clientType = _clientType as ShopifyClientType
                const clientConfig = config.clients[clientType]

                if (!clientConfig) continue

                setupClient(nuxt, config, clientType, clientConfig)
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            updateRuntimeConfig({
                _shopify: config,

                public: { _shopify: publicConfig },
            })

            registerAutoImports(nuxt, config, resolver)

            log.success('Finished setup')
        }
        else {
            log.info('Skipping setup: config not provided or invalid')
            log.info('See module configuration reference: https://konkonam.github.io/nuxt-shopify/configuration/module')
            log.debug(`Error while parsing module options:\n${moduleOptions.error}`)
        }

        if (ROLLUP_REPLACE_VIRTUAL_MODULES) {
            registerVirtualModuleTemplates(nuxt)
        }
    },
})
