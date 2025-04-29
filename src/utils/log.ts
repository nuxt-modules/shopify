import type { ConsolaOptions } from 'consola'

import { useLogger } from '@nuxt/kit'

let loggerInstance: ReturnType<typeof useLogger>

export const useLog = (options?: Partial<ConsolaOptions>) => {
    if (loggerInstance) return loggerInstance

    return loggerInstance = useLogger('shopify', options)
}
