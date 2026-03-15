import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addServerImports, addImports } from '@nuxt/kit'
import { kebabCase, pascalCase } from 'scule'

import { ShopifyClientType } from '../schemas'

export function registerClientServerImports(clientType: ShopifyClientType, resolver: Resolver) {
  addServerImports([{
    from: resolver.resolve(`./runtime/server/utils/${kebabCase(clientType)}/client`),
    name: `use${pascalCase(clientType)}`,
  }])
}

export function registerClientImports(clientType: ShopifyClientType, resolver: Resolver) {
  addImports([
    {
      from: resolver.resolve(`./runtime/composables/${kebabCase(clientType)}/client`),
      name: `use${pascalCase(clientType)}`,
    },
    {
      from: resolver.resolve(`./runtime/composables/${kebabCase(clientType)}/async`),
      name: `use${pascalCase(clientType)}Data`,
    },
  ])
}

export function isPublicClient(config: ShopifyConfig['clients'][ShopifyClientType]): boolean {
  return !!(
    (config as { publicAccessToken?: string })?.publicAccessToken
    || (config as { mock?: boolean })?.mock
    || (config as { clientId?: string })?.clientId
  )
}

export function hasPublicClient(config: ShopifyConfig): boolean {
  const storefrontConfig = config.clients[ShopifyClientType.Storefront]
  const customerAccountConfig = config.clients[ShopifyClientType.CustomerAccount]

  return !!(storefrontConfig?.publicAccessToken || storefrontConfig?.mock) || !!customerAccountConfig?.clientId
}

export function getConfiguredClients(config: ShopifyConfig): ShopifyClientType[] {
  const clients = []

  for (const clientType in config.clients) {
    if (config.clients[clientType as ShopifyClientType]) {
      clients.push(clientType as ShopifyClientType)
    }
  }

  return clients
}
