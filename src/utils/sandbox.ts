import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../types'

import type { ShopifyClientType } from '../schemas'
import { addDevServerHandler, addServerHandler, type Resolver } from '@nuxt/kit'
import { defineEventHandler } from 'h3'
import { kebabCase } from 'scule'

import getSandboxTemplate from '../templates/sandbox'

function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType): string {
  const url = new URL(nuxt.options.devServer.url)

  return url.href + '_sandbox/' + kebabCase(clientType)
}

function createSandboxHandler(clientType: ShopifyClientType) {
  return defineEventHandler(async (event: H3Event) => {
    event.headers.set('content-type', 'text/html')

    return getSandboxTemplate(clientType)
  })
}

export function registerSandbox(nuxt: Nuxt, resolver: Resolver, clientType: ShopifyClientType): string {
  addDevServerHandler({
    handler: createSandboxHandler(clientType),
    route: `/_sandbox/${kebabCase(clientType)}`,
  })

  addServerHandler({
    handler: resolver.resolve('./runtime/server/utils/sandbox/proxy'),
    route: `/_sandbox/proxy/${kebabCase(clientType)}`,
  })

  return getSandboxUrl(nuxt, clientType)
}

export function shouldEnableSandbox(nuxt: Nuxt, clientConfig: ShopifyConfig['clients'][ShopifyClientType]): boolean {
  return !!(nuxt.options.dev && clientConfig?.sandbox)
}
