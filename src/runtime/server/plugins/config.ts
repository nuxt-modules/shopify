import type { ShopifyClientType } from '../../utils/config'

import { configureLogging } from '@shopify/hydrogen'
import { defu } from 'defu'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { z } from 'zod'

import { configObjectSchema, findInvalidFeatures, publicConfigSchema, withoutFeatures } from '../../utils/config'
import { resolveShopId } from '../../utils/clients/customer-account/discovery'
import { createLogger } from '../utils/log'

export default defineNitroPlugin((nitroApp) => {
  const base = useRuntimeConfig()
  const logger = createLogger()

  if (base._shopify?.logger) configureLogging({ logger: logger.withTag('hydrogen'), level: 'trace' })

  const shopify = defu(base.public.shopify, base.shopify)

  const input = {
    ...shopify,
    clients: Object.fromEntries(Object.entries(shopify.clients ?? {}).map(([type, client]) => [
      type,
      client && !client.apiVersion ? { ...client, apiVersion: base._shopify?.clients[type as ShopifyClientType]?.apiVersion } : client,
    ])),
  }

  let parsed = configObjectSchema.safeParse(input)

  const invalidFeatures = parsed.success ? undefined : findInvalidFeatures(parsed.error)

  if (!parsed.success && invalidFeatures) {
    logger.warn(`Keeping the build's ${invalidFeatures.map(feature => `\`${feature.join('.')}\``).join(', ')}: invalid runtime module configuration\n${z.prettifyError(parsed.error)}`)

    parsed = configObjectSchema.safeParse(defu(withoutFeatures(input, invalidFeatures), base._shopify))
  }

  if (!parsed.success) {
    logger.warn(`Invalid runtime module configuration, keeping built config\n${z.prettifyError(parsed.error)}`)

    return
  }

  const resolved = resolveShopId(parsed.data, base._shopify, logger)
    .then(shopify => ({ shopify, publicShopify: publicConfigSchema.parse(shopify) }))
    .catch((error) => {
      logger.warn(`Failed to resolve the runtime module configuration, keeping built config: ${error}`)

      return undefined
    })

  nitroApp.hooks.hook('request', async (event) => {
    const config = await resolved

    if (!config) return

    const runtimeConfig = useRuntimeConfig(event)

    runtimeConfig._shopify = config.shopify
    runtimeConfig.public._shopify = config.publicShopify
  })
})
