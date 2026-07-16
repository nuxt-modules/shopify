import type { ConsolaOptions } from 'consola'

import { useRuntimeConfig } from 'nitropack/runtime'
import { createConsola } from 'consola'

export function createLogger() {
  let options: Partial<ConsolaOptions> | undefined

  try {
    options = useRuntimeConfig()._shopify?.logger
  }
  catch {
    options = undefined
  }

  return createConsola(options).withTag('shopify')
}
