import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'

export default function setupVite(nuxt: Nuxt, config: ShopifyConfig) {
  const logger = useLogger()

  nuxt.options.vite.optimizeDeps ??= {}
  nuxt.options.vite.optimizeDeps.include ??= []

  const deps: string[] = []

  if (config.clients?.storefront || config.clients?.customerAccount || config.clients?.admin) {
    deps.push('@shopify/graphql-client')
  }

  if (config.clients?.customerAccount) {
    deps.push('@shopify/hydrogen')
  }

  if (config.analytics) {
    deps.push('@shopify/hydrogen-react')
  }

  if (config.clients?.storefront?.cache !== false) {
    deps.push('lru-cache')
  }

  deps.push('zod')

  const include = nuxt.options.vite.optimizeDeps.include
  const missing = deps.filter(dep => !include.includes(dep))

  if (missing.length) {
    logger.debug(`Pre-bundling runtime dependencies: ${missing.join(', ')}`)

    include.push(...missing)
  }
}
