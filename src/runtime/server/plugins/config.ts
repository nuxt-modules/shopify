import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { z } from 'zod'

import { configObjectSchema, publicConfigSchema } from '../../utils/config'
import { resolveApiUrl } from '../../utils/resolve'
import { createLogger } from '../utils/log'

export default defineNitroPlugin((nitroApp) => {
  const base = useRuntimeConfig()
  const logger = createLogger()

  const parsed = configObjectSchema.safeParse(base.shopify)

  if (!parsed.success) {
    logger.warn(`Invalid runtime module configuration, keeping built config\n${z.prettifyError(parsed.error)}`)

    return
  }

  const resolved = resolveApiUrl(parsed.data, base._shopify, logger)
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
