import type { ConsolaOptions } from 'consola'

import { useRuntimeConfig } from '#imports'
import { createConsola } from 'consola'

export function createLogger() {
  let options: Partial<ConsolaOptions> | undefined

  try {
    options = useRuntimeConfig().public._shopify?.logger
  }
  catch {
    options = undefined
  }

  return createConsola(options).withTag('shopify')
}
