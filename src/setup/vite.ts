import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { isResolvableFrom } from '../utils/install'
import { useLogger } from '../utils/log'

const MODULE_ID = '@nuxtjs/shopify'

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

  if (config.clients?.storefront && config.clients.storefront.cache !== false) {
    deps.push('lru-cache')
  }

  deps.push('zod')

  const include = nuxt.options.vite.optimizeDeps.include
  const missing: string[] = []
  const unresolvable: string[] = []

  const resolvableFromRoot = (id: string) => isResolvableFrom(id, nuxt.options.rootDir)
  const canNestUnderModule = resolvableFromRoot(MODULE_ID)

  for (const dep of deps) {
    const id = resolvableFromRoot(dep)
      ? dep
      : canNestUnderModule
        ? `${MODULE_ID} > ${dep}`
        : undefined

    if (!id) {
      unresolvable.push(dep)
      continue
    }

    if (!include.includes(id)) {
      missing.push(id)
    }
  }

  if (unresolvable.length) {
    logger.debug(`Skipping pre-bundling of unresolvable dependencies: ${unresolvable.join(', ')}`)
  }

  if (missing.length) {
    logger.debug(`Pre-bundling runtime dependencies: ${missing.join(', ')}`)

    include.push(...missing)
  }
}
