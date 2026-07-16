import type { ConsolaOptions } from 'consola'

import { useLogger as nuxtLogger } from '@nuxt/kit'

type LoggerInstance = ReturnType<typeof nuxtLogger>

let instance: LoggerInstance | undefined

export function initLogger(options?: Partial<ConsolaOptions>): LoggerInstance {
  instance = nuxtLogger('shopify', options)

  return instance
}

export function useLogger(): LoggerInstance {
  return instance ??= nuxtLogger('shopify')
}
