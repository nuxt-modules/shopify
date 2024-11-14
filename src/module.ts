import type { ModuleOptions } from './types'

import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule, updateTemplates,
} from '@nuxt/kit'

import {
    registerTemplates,
    removePreset,
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
        'shopify:config': async ({ nuxt, config }) => {
            nuxt.options.runtimeConfig._shopify = config
        },
        'prepare:types': async (params) => {

        },
    },

    async setup(options, nuxt) {
        const logger = useLogger('nuxt-shopify')

        if (!options || Object.keys(options).length < 1) {
            logger.warn('No shopify configuration provided.')
        }
        else {
            logger.info('Starting shopify setup')

            const shopifyConfig = useShopifyConfig(options)

            addServerImportsDir(
                createResolver(import.meta.url).resolve('./runtime/server/utils'),
            )

            registerTemplates(shopifyConfig)

            // Remove the preset from the config to avoid serialization issues
            removePreset(shopifyConfig.clients?.storefront?.codegen)
            removePreset(shopifyConfig.clients?.admin?.codegen)

            await nuxt.callHook('shopify:config', {
                nuxt,
                config: shopifyConfig,
            })

            await updateTemplates({
                filter: () => true,
            })

            logger.success('Finished shopify setup')
        }
    },
})
