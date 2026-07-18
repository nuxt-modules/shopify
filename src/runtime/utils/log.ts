import type { ConsolaOptions } from 'consola'

import { useRuntimeConfig } from '#imports'
import { createConsola } from 'consola'

let logger: ReturnType<typeof createConsola> | undefined

export function createLogger() {
  if (logger) return logger

  let options: Partial<ConsolaOptions> | undefined

  try {
    options = useRuntimeConfig().public._shopify?.logger
  }
  catch {
    return createConsola().withTag('shopify')
  }

  logger = createConsola(options).withTag('shopify')

  return logger
}
