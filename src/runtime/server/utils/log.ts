import type { ConsolaOptions } from 'consola'

import { useRuntimeConfig } from 'nitropack/runtime'
import { createConsola } from 'consola'

import { tryUseEvent } from './event'

export function createLogger() {
  let options: Partial<ConsolaOptions> | undefined

  try {
    options = useRuntimeConfig(tryUseEvent())._shopify?.logger
  }
  catch {
    options = undefined
  }

  return createConsola(options).withTag('shopify')
}
