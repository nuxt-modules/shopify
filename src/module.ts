import type { ModuleOptions } from './types'

import {
    addServerImportsDir,
    createResolver,
    useLogger,
    defineNuxtModule,
} from '@nuxt/kit'

import { useCodegen, useShopifyConfig } from './utils'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    hooks: {
        'shopify:codegen': async (params) => {
            return await useCodegen(params)
        },
        'shopify:config': async ({ nuxt, config }) => {
            nuxt.options.runtimeConfig._shopify = config
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
            await nuxt.callHook('shopify:codegen', { nuxt, config })

            logger.success('Finished shopify setup')
        }
    },
})
