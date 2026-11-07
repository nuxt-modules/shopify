import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../types'

import { randomUUID } from 'node:crypto'

import { ShopifyClientType } from '../schemas'
import { addDevServerHandler, type Resolver } from '@nuxt/kit'
import { defineEventHandler, setResponseHeader } from 'h3'
import { kebabCase, titleCase } from 'scule'

import { assertLocalRequest } from '../runtime/server/utils/csrf'
import { CUSTOMER_ACCOUNT_PROXY_ROUTE } from '../runtime/utils/clients/transport'
import { addUncachedServerHandler } from './routes'

const ADMIN_PROXY_ROUTE = '/_explorer/proxy/admin'

function getExplorerEndpoint(config: ShopifyConfig, clientType: ShopifyClientType, token: string): string {
  if (clientType === ShopifyClientType.Storefront) return `/api/${config.clients.storefront!.apiVersion}/graphql.json`

  if (clientType === ShopifyClientType.CustomerAccount) return CUSTOMER_ACCOUNT_PROXY_ROUTE.replace(':version', config.clients.customerAccount!.apiVersion)

  return `${ADMIN_PROXY_ROUTE}/${token}`
}

function createExplorerHandler(clientType: ShopifyClientType, endpoint: string) {
  return defineEventHandler(async (event: H3Event) => {
    assertLocalRequest(event)

    const { renderGraphiQL } = await import('@graphql-yoga/render-graphiql')

    setResponseHeader(event, 'content-type', 'text/html')

    return renderGraphiQL({
      title: `Explorer - ${titleCase(clientType)}`,
      endpoint,
      defaultEditorToolsVisibility: true,
    })
  })
}

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
