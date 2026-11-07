import type { ConsolaInstance, ConsolaOptions } from 'consola'

import { useLogger as nuxtLogger } from '@nuxt/kit'

let instance: ConsolaInstance | undefined

export function initLogger(options?: Partial<ConsolaOptions>): ConsolaInstance {
  instance = nuxtLogger('shopify', options)

  return instance
}

export function useLogger(): ConsolaInstance {
  return instance ??= nuxtLogger('shopify')
}
