import type { NuxtLogger } from '@nuxt/kit'
import type { ConsolaOptions } from 'consola'

import { useLogger as nuxtLogger } from '@nuxt/kit'

let instance: NuxtLogger | undefined

export function initLogger(options?: Partial<ConsolaOptions>): NuxtLogger {
  instance = nuxtLogger('shopify', options)

  return instance
}

export function useLogger(): NuxtLogger {
  return instance ??= nuxtLogger('shopify')
}
