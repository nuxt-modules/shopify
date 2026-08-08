import type { ModuleOptions } from './types'

import {
  defineNuxtModule,
  useRuntimeConfig,
  createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'
import { z } from 'zod'

import setupAnalytics from './setup/analytics'
import setupAuth from './setup/auth'
import setupCache from './setup/cache'
import setupClients from './setup/clients'
import setupCodegen from './setup/codegen'
import setupGraphqlConfig from './setup/graphql-config'
import setupImports from './setup/imports'
import setupProxy from './setup/proxy'
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

    const moduleOptions = await configSchema.safeParseAsync({ ...rawConfig, _nuxt: nuxt })

    if (moduleOptions.success) {
      logger.start('Starting setup')

      const config = moduleOptions.data

      logger.debug(`Configured clients: ${getConfiguredClients(config).join(', ') || 'none'}`)

      await nuxt.callHook('shopify:config', { nuxt, config })

      const publicConfig = publicConfigSchema.parse(config)

      Object.assign(nuxt.options.runtimeConfig, defu({
        _shopify: config,

        public: {
          _shopify: publicConfig,
        },
      }, nuxt.options.runtimeConfig))

      setupClients(nuxt, config, resolver)
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
      const reference = 'See the module configuration reference: https://shopify.nuxtjs.org/essentials/configuration'

      if (!nuxt.options.dev && !nuxt.options._prepare) {
        throw new Error(`[shopify] Invalid module configuration\n${z.prettifyError(moduleOptions.error)}\n${reference}`)
      }

      logger.error(`Skipping setup: invalid module configuration\n${z.prettifyError(moduleOptions.error)}`)
      logger.info(reference)
    }
    else {
      logger.info('Skipping setup: no module configuration provided')
      logger.info('See the module configuration reference: https://shopify.nuxtjs.org/essentials/configuration')
    }
  },
})

export {
  createShopifyClient,
  createStorefrontClient,
  createCustomerAccountClient,
  createAdminClient,
} from './runtime/utils/clients'

export type * from './types/index'
