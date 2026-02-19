import type { ShopifyConfig } from '../types'

import { useLogger as nuxtLogger } from '@nuxt/kit'

export const useLogger = (config?: Pick<ShopifyConfig, 'logger'>) => {
    return nuxtLogger('shopify', config?.logger)
}
