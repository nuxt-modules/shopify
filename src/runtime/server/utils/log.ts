import type { ConsolaOptions } from 'consola'
import type { H3Event } from 'h3'

import { useEvent, useRuntimeConfig } from 'nitropack/runtime'
import { createConsola } from 'consola'

export function createLogger() {
  let event: H3Event | undefined
  let options: Partial<ConsolaOptions> | undefined

  try {
    event = useEvent()
  }
  catch {
    event = undefined
  }

  try {
    options = useRuntimeConfig(event)._shopify?.logger
  }
  catch {
    options = undefined
  }

  return createConsola(options).withTag('shopify')
}
