import type { ModuleOptions } from './types'

import {
  defineNuxtModule,
  useRuntimeConfig,
  updateRuntimeConfig,
  createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'
import { z } from 'zod'

import setupAnalytics from './setup/analytics'
import setupAuth from './setup/auth'
import setupCache from './setup/cache'
import setupClients from './setup/clients'
import setupCodegen from './setup/codegen'
import setupDevMode from './setup/dev'
import setupGraphqlConfig from './setup/graphql-config'
import setupImports from './setup/imports'
import setupProxy from './setup/proxy'
import setupRequirements from './setup/requirements'
import setupSandbox from './setup/sandbox'
import setupVite from './setup/vite'
import setupWebhooks from './setup/webhooks'

import { configSchema, publicConfigSchema } from './schemas'
import { getConfiguredClients } from './utils/clients'
import { initLogger } from './utils/log'

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

    const resolver = createResolver(import.meta.url)

    const rawConfig = defu(
      runtimeConfig.public.shopify,
      runtimeConfig.shopify,
      options,
    )

    const logger = initLogger(rawConfig?.logger)

    const moduleOptions = configSchema.safeParse(rawConfig)
    const publicModuleOptions = publicConfigSchema.safeParse(rawConfig)

    if (moduleOptions.success && publicModuleOptions.success) {
      logger.start('Starting setup')

      const config = moduleOptions.data
      const publicConfig = publicModuleOptions.data

      logger.debug(`Configured clients: ${getConfiguredClients(config).join(', ') || 'none'}`)

      await nuxt.callHook('shopify:config', { nuxt, config })

      setupRequirements(config, publicConfig)

      updateRuntimeConfig({
        _shopify: config,

        public: {
          _shopify: publicConfig,
        },
      })

      await setupClients(nuxt, config, resolver)

      setupCodegen(nuxt, config)
      setupAnalytics(config, resolver)
      setupImports(nuxt, config, resolver)
      setupCache(nuxt, config, resolver)
      setupProxy(nuxt, config, resolver)
      setupAuth(nuxt, config)
      setupSandbox(nuxt, config, resolver)
      setupGraphqlConfig(nuxt, config)
      setupVite(nuxt, config)
      setupWebhooks(resolver)

      await nuxt.callHook('shopify:setup', { nuxt, config })

      logger.success('Finished setup')
    }
    else if (Object.keys(rawConfig ?? {}).length) {
      const issues = [...new Set(
        [moduleOptions.error, publicModuleOptions.error]
          .flatMap(error => error ? [z.prettifyError(error)] : []),
      )].join('\n')

      logger.error(`Skipping setup: invalid module configuration\n${issues}`)
      logger.info('See the module configuration reference: https://shopify.nuxtjs.org/essentials/configuration')
    }
    else {
      logger.info('Skipping setup: no module configuration provided')
      logger.info('See the module configuration reference: https://shopify.nuxtjs.org/essentials/configuration')
    }

    await setupDevMode(nuxt)
  },
})

export type * from './types/index'
