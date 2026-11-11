import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { randomUUID } from 'node:crypto'
import { addDevServerHandler } from '@nuxt/kit'
import { defineEventHandler } from 'h3'
import { kebabCase } from 'scule'
import { joinURL } from 'ufo'

import { ShopifyClientType } from '../schemas'
import { getConfiguredClients } from '../utils/clients'
import { onDevServerURL } from '../utils/dev'
import { ADMIN_PROXY_ROUTE, assertLocalRequest, createExplorerHandler, getExplorerEndpoint } from '../utils/explorer'
import { useLogger } from '../utils/log'
import { addUncachedServerHandler } from '../utils/routes'

export function registerExplorer(resolver: Resolver, config: ShopifyConfig, clientType: ShopifyClientType): string {
  const admin = clientType === ShopifyClientType.Admin
  const token = randomUUID()
  const route = admin ? `/_explorer/admin/${token}` : `/_explorer/${kebabCase(clientType)}`

  addDevServerHandler({
    handler: createExplorerHandler(clientType, getExplorerEndpoint(config, clientType, token)),
    route,
  })

  if (admin) {
    addDevServerHandler({
      handler: defineEventHandler(assertLocalRequest),
      route: ADMIN_PROXY_ROUTE,
    })

    addUncachedServerHandler({
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/admin/explorer'),
      route: `${ADMIN_PROXY_ROUTE}/${token}`,
    })
  }

  return route
}

export function shouldEnableExplorer(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType): boolean {
  if (!nuxt.options.dev || !config.clients[clientType]?.explorer) return false

  return clientType !== ShopifyClientType.CustomerAccount || !!config.clients.customerAccount?.proxy
}

export default function setupExplorer(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()
  for (const { clientType } of getConfiguredClients(config)) {
    if (shouldEnableExplorer(nuxt, config, clientType)) {
      const path = registerExplorer(resolver, config, clientType)

      onDevServerURL(nuxt, origin =>
        logger.info(`The ${kebabCase(clientType)} explorer is available at ${joinURL(origin, path)}`),
      )
    }
  }
}
