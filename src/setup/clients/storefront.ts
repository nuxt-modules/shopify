import type { ShopifyClientSetupContext } from '../../types'

import { addPlugin } from '@nuxt/kit'

import { ShopifyClientType } from '../../schemas'
import {
  isPublicClient,
  registerClientAsyncImports,
  registerClientImports,
  registerClientServerImports,
} from '../../utils/clients'
import { useLogger } from '../../utils/log'
import { registerStorageMount } from '../../utils/storage'

export default function setupStorefrontClient({ nuxt, config, resolver }: ShopifyClientSetupContext) {
  const storefront = config.clients[ShopifyClientType.Storefront]

  if (!storefront) return

  const logger = useLogger()

  registerClientServerImports(ShopifyClientType.Storefront, resolver)

  if (isPublicClient(storefront)) {
    registerClientImports(ShopifyClientType.Storefront, resolver)
    registerClientAsyncImports(ShopifyClientType.Storefront, resolver)
  }

  const cache = typeof storefront.cache === 'object' ? storefront.cache : undefined

  registerStorageMount(nuxt, 'storefront-proxy', cache?.proxy)

  if (cache?.client) {
    addPlugin(resolver.resolve('./runtime/plugins/cache/storefront'))
  }
  else {
    logger.debug('Skipping the storefront client cache plugin: `cache.client` is disabled')
  }
}
