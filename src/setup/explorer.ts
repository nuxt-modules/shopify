import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { upperFirst } from 'scule'
import { joinURL } from 'ufo'

import { useLogger } from '../utils/log'
import { getConfiguredClients } from '../utils/clients'
import { onDevServerURL } from '../utils/dev'
import {
  registerExplorer,
  shouldEnableExplorer,
} from '../utils/explorer'
import type { Resolver } from '@nuxt/kit'

export default function setupExplorer(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()
  const clients = getConfiguredClients(config)

  for (const clientType of clients) {
    const clientConfig = config.clients[clientType]

    if (shouldEnableExplorer(nuxt, clientConfig)) {
      const path = registerExplorer(resolver, clientType)

      onDevServerURL(nuxt, origin =>
        logger.info(`${upperFirst(clientType)} explorer available at: ${joinURL(origin, path)}`),
      )
    }
  }
}
