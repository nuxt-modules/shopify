import type { Resolver } from '@nuxt/kit'

import type {
  ShopifyClientType,
  ShopifyConfig,
} from '../types'

import { addServerHandler } from '@nuxt/kit'
import { withLeadingSlash } from 'ufo'

import { kebabCase } from 'scule'

export function registerProxy(config: ShopifyConfig, clientType: ShopifyClientType, resolver: Resolver): string | false {
  const clientConfig = config.clients[clientType]

  if (!clientConfig) return false

  const url = 'proxy' in clientConfig ? typeof clientConfig.proxy === 'object' ? clientConfig.proxy.path : undefined : undefined

  if (!url) return false

  addServerHandler({
    handler: resolver.resolve(`./runtime/server/api/proxy/${kebabCase(clientType)}`),
    route: withLeadingSlash(url),
  })

  return url
}
