import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import {
  addImports,
  addPlugin,
  addRouteMiddleware,
  addServerHandler,
  addServerImports,
} from '@nuxt/kit'
import { kebabCase, pascalCase } from 'scule'
import { joinURL, withLeadingSlash, withoutHost } from 'ufo'

import { ShopifyClientType } from '../schemas'
import { onDevServerURL } from './dev'
import { useLogger } from './log'

type CustomerAccountConfig = NonNullable<ShopifyConfig['clients']['customerAccount']>

export function registerClientServerImports(clientType: ShopifyClientType, resolver: Resolver) {
  addServerImports([{
    from: resolver.resolve(`./runtime/server/utils/${kebabCase(clientType)}/client`),
    name: `use${pascalCase(clientType)}`,
  }])
}

export function registerClientImports(clientType: ShopifyClientType, resolver: Resolver) {
  addImports([{
    from: resolver.resolve(`./runtime/composables/${kebabCase(clientType)}/client`),
    name: `use${pascalCase(clientType)}`,
  }])
}

export function registerClientAsyncImports(clientType: ShopifyClientType, resolver: Resolver) {
  addImports([{
    from: resolver.resolve(`./runtime/composables/${kebabCase(clientType)}/async`),
    name: `use${pascalCase(clientType)}Data`,
  }])
}

export function registerCustomerAccountAuthRoutes(customerAccount: CustomerAccountConfig, resolver: Resolver) {
  const routes = [
    { path: withLeadingSlash(customerAccount.routes.callback), handler: 'callback' },
    { path: withLeadingSlash(customerAccount.routes.logout), handler: 'logout' },
    { path: withLeadingSlash(customerAccount.routes.session), handler: 'session' },
  ]

  for (const { path, handler } of routes) {
    addServerHandler({
      method: 'get',
      route: path,
      handler: resolver.resolve(`./runtime/server/api/auth/customer-account/${handler}`),
    })
  }

  useLogger().debug(`Registered customer account auth routes: ${routes.map(({ path }) => `\`${path}\``).join(', ')}`)
}

export function registerCustomerAccountDevBridge(nuxt: Nuxt, customerAccount: CustomerAccountConfig, resolver: Resolver) {
  if (!nuxt.options.dev || !customerAccount.dev?.tunnelURL || !customerAccount.dev?.bridgeURL) return

  const path = withLeadingSlash(withoutHost(customerAccount.dev.bridgeURL))

  addServerHandler({
    method: 'get',
    route: path,
    handler: resolver.resolve('./runtime/server/api/auth/customer-account/bridge'),
  })

  onDevServerURL(nuxt, (origin) => {
    const dev = nuxt.options.runtimeConfig._shopify?.clients.customerAccount?.dev

    if (dev) dev.bridgeURL = joinURL(origin, path)
  })

  useLogger().debug(`Registered customer account dev bridge at \`${path}\``)
}

export function registerCustomerAccountSession(resolver: Resolver) {
  addImports([{
    from: resolver.resolve('./runtime/composables/customer-account/session'),
    name: 'useCustomerAccountSession',
  }])

  addServerImports([
    'getCustomerAccountSession',
    'requireCustomerAccountSession',
    'clearCustomerAccountSession',
  ].map(name => ({
    from: resolver.resolve('./runtime/server/utils/customer-account/session'),
    name,
  })))

  addRouteMiddleware({
    name: 'customer-account',
    path: resolver.resolve('./runtime/middleware/customer-account'),
    global: false,
  })

  addPlugin(resolver.resolve('./runtime/plugins/customer-account/session'))

  useLogger().debug('Registered customer account route middleware `customer-account`')
}

export function isPublicClient(config: ShopifyConfig['clients'][ShopifyClientType]): boolean {
  return !!((config as { publicAccessToken?: string })?.publicAccessToken
    || (config as { mock?: boolean })?.mock
    || (config as { clientId?: string })?.clientId
  )
}

export function hasPublicClient(config: ShopifyConfig): boolean {
  const storefrontConfig = config.clients[ShopifyClientType.Storefront]
  const customerAccountConfig = config.clients[ShopifyClientType.CustomerAccount]

  return !!(storefrontConfig?.publicAccessToken
    || storefrontConfig?.mock
    || customerAccountConfig?.clientId)
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
