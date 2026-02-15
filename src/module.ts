import type { ModuleOptions } from './types'

import {
    defineNuxtModule,
    useRuntimeConfig,
    updateRuntimeConfig,
    createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'

import setupCache from './setup/cache'
import setupClients from './setup/clients'
import setupCodegen from './setup/codegen'
import setupDevMode from './setup/dev'
import setupImports from './setup/imports'
import setupProxy from './setup/proxy'
import setupSandbox from './setup/sandbox'
import setupWebhooks from './setup/webhooks'

import { configSchema, publicConfigSchema } from './schemas'
import { useLogger } from './utils/log'

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
        const logger = useLogger(options.logger)

        const resolver = createResolver(import.meta.url)

        const rawConfig = defu(
            runtimeConfig.public.shopify,
            runtimeConfig.shopify,
            options,
        )

        const moduleOptions = configSchema.safeParse(rawConfig)
        const publicModuleOptions = publicConfigSchema.safeParse(rawConfig)

        if (moduleOptions.success && publicModuleOptions.success) {
            logger.start('Starting setup')

            const config = moduleOptions.data
            const publicConfig = publicModuleOptions.data

            await nuxt.callHook('shopify:config', { nuxt, config })

            updateRuntimeConfig({
                _shopify: config,

                public: {
                    _shopify: publicConfig,
                },
            })

            await setupClients(config, resolver)
            await setupCache(config, resolver)

            await setupImports(nuxt, config, resolver)
            await setupProxy(nuxt, config, resolver)
            await setupWebhooks(nuxt, config, resolver)

            await setupCodegen(nuxt, config)
            await setupSandbox(nuxt, config)

            await nuxt.callHook('shopify:setup', { nuxt, config })

            logger.success('Finished setup')
        }
        else {
            const error = `${moduleOptions.error ? moduleOptions.error : ''}${publicModuleOptions.error ? publicModuleOptions.error : ''}`

            logger.info('Skipping setup: config not provided or invalid')
            logger.info('See module configuration reference: https://shopify.nuxtjs.org/essentials/configuration')
            logger.debug(`Error while parsing module options:\n${error}`)
        }

        await setupDevMode(nuxt, logger)
    },
})

export type * from './types/index'
