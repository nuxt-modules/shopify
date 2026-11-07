import type { ModuleOptions } from './types'

import {
  defineNuxtModule,
  useRuntimeConfig,
  createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'
import { z } from 'zod'

import setupConfig from './setup/config'
import setupAnalytics from './setup/analytics'
import setupClients from './setup/clients'
import setupCodegen from './setup/codegen'
import setupGraphqlConfig from './setup/graphql-config'
import setupGraphqlTransform from './setup/graphql-transform'
import setupImports from './setup/imports'
import setupExplorer from './setup/explorer'
import setupVite from './setup/vite'
import setupWebhooks from './setup/webhooks'

import { configSchema } from './schemas'
import { warnPublicOptions, warnUnrecognizedOptions } from './schemas/resolve'
import { findInvalidFeatures, withoutFeatures } from './runtime/utils/config'
import { getConfiguredClients } from './utils/clients'
import { initLogger } from './utils/log'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxtjs/shopify',
    configKey: 'shopify',
    compatibility: {
      nuxt: '>=3.17.0',
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

    const { storefront, admin, customerAccount } = rawConfig?.clients ?? {}

    for (const client of [storefront, admin, customerAccount]) {
      if (client && !client.apiVersion) delete client.apiVersion
    }

    let input = rawConfig

    let moduleOptions = await configSchema.safeParseAsync({ ...input, _nuxt: nuxt })

    const invalidFeatures = !moduleOptions.success && (nuxt.options.dev || nuxt.options._prepare)
      ? findInvalidFeatures(moduleOptions.error)
      : undefined

    if (!moduleOptions.success && invalidFeatures) {
      logger.error(`Skipping ${invalidFeatures.map(feature => `\`${feature.join('.')}\``).join(', ')}: invalid configuration\n${z.prettifyError(moduleOptions.error)}`)

      input = withoutFeatures(input, invalidFeatures)
      moduleOptions = await configSchema.safeParseAsync({ ...input, _nuxt: nuxt })
    }

    if (moduleOptions.success) {
      logger.start('Starting setup')

      const config = moduleOptions.data

      warnUnrecognizedOptions(input)
      warnPublicOptions(runtimeConfig.public.shopify, config)

      logger.debug(`Configured clients: ${getConfiguredClients(config).join(', ') || 'none'}`)

      await nuxt.callHook('shopify:config', { nuxt, config })

      setupConfig(nuxt, config, resolver)
      setupClients(nuxt, config, resolver)
      setupCodegen(nuxt, config)
      setupAnalytics(nuxt, config, resolver)
      setupImports(nuxt, config, resolver)
      setupExplorer(nuxt, config, resolver)
      setupGraphqlConfig(nuxt, config)
      setupVite(nuxt, config)
      setupWebhooks(resolver)

      await setupGraphqlTransform(nuxt, config)

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

export { ShopifyClientType } from './schemas'

export {
  createShopifyApiClient,
  createStorefrontApiClient,
  createCustomerAccountApiClient,
  createAdminApiClient,
} from './runtime/utils/clients'

export type * from './types/index'
