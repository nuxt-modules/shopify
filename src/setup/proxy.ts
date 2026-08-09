import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import { onDevServerURL } from '../utils/dev'
import { registerProxy } from '../utils/proxy'
import { ShopifyClientType } from '../schemas'
import { upperFirst } from 'scule'
import { joinURL } from 'ufo'

export default function setupProxy(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()

  for (const clientType of Object.values(ShopifyClientType)) {
    const route = registerProxy(config, clientType, resolver)

    if (!route) continue

    onDevServerURL(nuxt, origin =>
      logger.debug(`${upperFirst(clientType)} proxy available at: ${joinURL(origin, route)}`),
    )
  }
}
