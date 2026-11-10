import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../types'

import { ShopifyClientType } from '../schemas'
import { createError, defineEventHandler, getRequestIP, getRequestURL, setResponseHeader } from 'h3'
import { titleCase } from 'scule'

import { CUSTOMER_ACCOUNT_PROXY_ROUTE, createApiUrl } from '../runtime/utils/clients/transport'

export const ADMIN_PROXY_ROUTE = '/_explorer/proxy/admin'

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '::1', 'local.tryhydrogen.dev']

const LOOPBACK_ADDRESS = /^(?:127(?:\.\d{1,3}){3}|::1|::ffff:127(?:\.\d{1,3}){3})$/

export function assertLocalRequest(event: H3Event) {
  if (LOCAL_HOSTNAMES.includes(getRequestURL(event).hostname) && LOOPBACK_ADDRESS.test(getRequestIP(event) ?? '')) return

  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] This endpoint is only available on localhost',
  })
}

export function getExplorerEndpoint(config: ShopifyConfig, clientType: ShopifyClientType, token: string): string {
  if (clientType === ShopifyClientType.Storefront) return createApiUrl('/', config.clients.storefront!.apiVersion)

  if (clientType === ShopifyClientType.CustomerAccount) return CUSTOMER_ACCOUNT_PROXY_ROUTE.replace(':version', config.clients.customerAccount!.apiVersion)

  return `${ADMIN_PROXY_ROUTE}/${token}`
}

export function createExplorerHandler(clientType: ShopifyClientType, endpoint: string) {
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
