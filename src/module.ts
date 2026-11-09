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

import { CONFIGURATION_DOCS_URL, resolveConfig, warnPublicOptions, warnUnrecognizedOptions } from './schemas/resolve'
import { configObjectSchema, findInvalidFeatures, withoutFeatures } from './runtime/utils/config'
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

    let moduleOptions = configObjectSchema.safeParse(input)

    const invalidFeatures = !moduleOptions.success && (nuxt.options.dev || nuxt.options._prepare)
      ? findInvalidFeatures(moduleOptions.error)
      : undefined

    if (!moduleOptions.success && invalidFeatures) {
      logger.error(`Skipping ${invalidFeatures.map(feature => `\`${feature.join('.')}\``).join(', ')}: invalid configuration\n${z.prettifyError(moduleOptions.error)}`)

      input = withoutFeatures(input, invalidFeatures)
      moduleOptions = configObjectSchema.safeParse(input)
    }

    if (moduleOptions.success) {
      logger.start('Starting setup')

      warnUnrecognizedOptions(input, moduleOptions.data)

      const config = await resolveConfig(moduleOptions.data, nuxt)

      warnPublicOptions(runtimeConfig.public.shopify, config)

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
      const reference = `See the module configuration reference: ${CONFIGURATION_DOCS_URL}`

      if (!nuxt.options.dev && !nuxt.options._prepare) {
        throw new Error(`[shopify] Invalid module configuration\n${z.prettifyError(moduleOptions.error)}\n${reference}`)
      }

      logger.error(`Skipping setup: invalid module configuration\n${z.prettifyError(moduleOptions.error)}`)
      logger.info(reference)
    }
    else {
      logger.info('Skipping setup: no module configuration provided')
      logger.info(`See the module configuration reference: ${CONFIGURATION_DOCS_URL}`)
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
