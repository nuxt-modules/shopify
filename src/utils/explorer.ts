import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../types'

import type { ShopifyClientType } from '../schemas'
import { addDevServerHandler, addServerHandler, type Resolver } from '@nuxt/kit'
import { defineEventHandler, setResponseHeader } from 'h3'
import { kebabCase } from 'scule'

function createExplorerHandler(clientType: ShopifyClientType) {
  return defineEventHandler(async (event: H3Event) => {
    const { renderGraphiQL } = await import('@graphql-yoga/render-graphiql')

    setResponseHeader(event, 'content-type', 'text/html')

    return renderGraphiQL({
      title: `Explorer - ${clientType}`,
      endpoint: `/_explorer/proxy/${kebabCase(clientType)}`,
      defaultEditorToolsVisibility: true,
    })
  })
}

export function registerExplorer(resolver: Resolver, clientType: ShopifyClientType): string {
  addDevServerHandler({
    handler: createExplorerHandler(clientType),
    route: `/_explorer/${kebabCase(clientType)}`,
  })

  addServerHandler({
    handler: resolver.resolve('./runtime/server/utils/explorer/proxy'),
    route: `/_explorer/proxy/${kebabCase(clientType)}`,
  })

  return `_explorer/${kebabCase(clientType)}`
}

export function shouldEnableExplorer(nuxt: Nuxt, clientConfig: ShopifyConfig['clients'][ShopifyClientType]): boolean {
  return !!(nuxt.options.dev && clientConfig?.explorer)
}
