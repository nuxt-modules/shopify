import type { ConsolaOptions } from 'consola'

import { useLogger as nuxtLogger } from '@nuxt/kit'

let loggerInstance: ReturnType<typeof nuxtLogger>

export const useLogger = (options?: Partial<ConsolaOptions>) => {
    if (loggerInstance) return loggerInstance

    return loggerInstance = nuxtLogger('shopify', options)
}
