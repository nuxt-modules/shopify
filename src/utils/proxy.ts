import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type {
  ShopifyClientType,
  ShopifyConfig,
} from '../types'

import { addServerHandler } from '@nuxt/kit'
import { joinURL, withLeadingSlash } from 'ufo'

import { kebabCase } from 'scule'

export function registerProxy(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType, resolver: Resolver): string | false {
  const clientConfig = config.clients[clientType]

  if (!clientConfig) return false

  const url = 'proxy' in clientConfig ? typeof clientConfig.proxy === 'object' ? clientConfig.proxy.path : undefined : undefined

  if (!url) return false

  addServerHandler({
    handler: resolver.resolve(`./runtime/server/api/proxy/${kebabCase(clientType)}`),
    route: withLeadingSlash(url),
  })

  return joinURL(nuxt.options.devServer.url, url)
}
