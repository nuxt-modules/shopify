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
import { withLeadingSlash, withoutHost } from 'ufo'

import { ShopifyClientType } from '../schemas'
import { DEV_ORIGIN_ENV } from '../runtime/utils/clients/customer-account/auth'
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

export function registerClientAsyncImports(nuxt: Nuxt, clientType: ShopifyClientType, resolver: Resolver) {
  const from = resolver.resolve(`./runtime/composables/${kebabCase(clientType)}/async`)
  const name = `use${pascalCase(clientType)}Data`

  addImports([{ from, name }])

  nuxt.options.optimization.keyedComposables.push({ name, argumentLength: 4, source: from })
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
    globalThis.process.env[DEV_ORIGIN_ENV] = origin
  })

  useLogger().debug(`Registered customer account dev bridge at \`${path}\``)
}

export function warnMissingCustomerAccountTunnel(nuxt: Nuxt, customerAccount: CustomerAccountConfig) {
  if (customerAccount.dev?.tunnelURL) return

  onDevServerURL(nuxt, (origin) => {
    if (new URL(origin).protocol === 'https:') return

    useLogger().warn(
      `The dev server runs on ${origin}, but Shopify rejects a plain HTTP \`redirect_uri\`, so customer account login will fail. `
      + 'Set `clients.customerAccount.dev.tunnelURL` to an HTTPS tunnel that forwards here',
    )
  })
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
