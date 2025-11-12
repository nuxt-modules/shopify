import type { ModuleOptions } from './types'

import {
    defineNuxtModule,
    useRuntimeConfig,
    updateRuntimeConfig,
    createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'

import setupCodegen from './setup/codegen'
import setupClients from './setup/clients'
import setupImports from './setup/imports'
import setupSandbox from './setup/sandbox'
import setupProxy from './setup/proxy'
import setupDevMode from './setup/dev'

import { configSchema } from './schemas'
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

        const moduleOptions = configSchema.safeParse(defu(
            runtimeConfig.public.shopify,
            runtimeConfig.shopify,
            options,
        ))

        await setupDevMode(nuxt, logger)

        if (moduleOptions.success) {
            logger.start('Starting setup')

            const { config, publicConfig } = moduleOptions.data

            await nuxt.callHook('shopify:config', { nuxt, config })

            updateRuntimeConfig({
                _shopify: config,

                public: {
                    _shopify: publicConfig,
                },
            })

            await setupClients(config, resolver)

            await setupImports(nuxt, config, resolver)
            await setupProxy(nuxt, config, resolver)

            await setupCodegen(nuxt, config)
            await setupSandbox(nuxt, config)

            await nuxt.callHook('shopify:setup', { nuxt, config })

            logger.success('Finished setup')
        }
        else {
            logger.info('Skipping setup: config not provided or invalid')
            logger.info('See module configuration reference: https://shopify.nuxtjs.org/essentials/configuration')
            logger.debug(`Error while parsing module options:\n${moduleOptions.error}`)
        }
    },
})

export type * from './types/index'
