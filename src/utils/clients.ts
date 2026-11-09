import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { MinimatchOptions } from 'minimatch'

import type { ShopifyConfig } from '../types'

import {
  addImports,
  addPlugin,
  addRouteMiddleware,
  addServerHandler,
  addServerImports,
  addServerPlugin,
} from '@nuxt/kit'
import { Minimatch, braceExpand } from 'minimatch'
import { kebabCase, pascalCase } from 'scule'

import { CUSTOMER_ACCOUNT_PROXY_ROUTE } from '../runtime/utils/clients/transport'
import { CUSTOMER_ACCOUNT_SESSION_ROUTE } from '../runtime/utils/session'
import { ShopifyClientType } from '../schemas'
import { onDevServerURL } from './dev'
import { useLogger } from './log'
import { CUSTOMER_ACCOUNT_ROUTES, STOREFRONT_ROUTES, addUncachedServerHandler, keepUncached } from './routes'

type CustomerAccountConfig = NonNullable<ShopifyConfig['clients']['customerAccount']>

export const DOCUMENT_ROUTING_ORDER = [
  ShopifyClientType.Admin,
  ShopifyClientType.CustomerAccount,
  ShopifyClientType.Storefront,
]

const GLOB_MAGIC = /[*?[\]{}()]/

export function splitDocuments(documents: string[]) {
  return {
    include: documents.filter(entry => !entry.startsWith('!')),
    exclude: documents.filter(entry => entry.startsWith('!')).map(entry => entry.slice(1)),
  }
}

function compileDocuments(patterns: string[], options?: MinimatchOptions) {
  return patterns.flatMap((entry) => {
    const pattern = entry.replace(/\\/g, '/').replace(/^\.\//, '')
    const folders = braceExpand(pattern).filter(glob => !GLOB_MAGIC.test(glob.slice(glob.lastIndexOf('/') + 1)))

    return [pattern, ...folders.map(folder => `${folder}/**`)].map(glob => new Minimatch(glob, options))
  })
}

function matchesAny(patterns: Minimatch[], path: string) {
  return patterns.some(pattern => pattern.pattern === path || pattern.match(path))
}

export function createDocumentMatcher(documents: string[]) {
  const { include, exclude } = splitDocuments(documents)
  const included = compileDocuments(include)
  const excluded = compileDocuments(exclude, { dot: true })

  return (path: string) => matchesAny(included, path) && !matchesAny(excluded, path)
}

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

export function registerShopifyRoutes(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const handler = resolver.resolve('./runtime/server/middleware/routes')

  if (nuxt.options.serverHandlers.some(serverHandler => serverHandler.handler === handler)) return

  addServerHandler({ middleware: true, handler })
  addServerPlugin(resolver.resolve('./runtime/server/plugins/response-headers'))

  const storefront = !!(config.clients.storefront || config.analytics)

  for (const route of [...storefront ? STOREFRONT_ROUTES : [], ...config.clients.customerAccount ? CUSTOMER_ACCOUNT_ROUTES : []]) {
    keepUncached(route)
  }

  if (!storefront) return

  addPlugin({ src: resolver.resolve('./runtime/plugins/redirects'), mode: 'server' })
  addPlugin(resolver.resolve('./runtime/plugins/scripts'))
}

export function registerCustomerAccountRoutes(customerAccount: CustomerAccountConfig, resolver: Resolver) {
  addUncachedServerHandler({
    method: 'get',
    route: CUSTOMER_ACCOUNT_SESSION_ROUTE,
    handler: resolver.resolve('./runtime/server/api/customer-account/session'),
  })

  if (!customerAccount.proxy) return

  addUncachedServerHandler({
    method: 'post',
    route: CUSTOMER_ACCOUNT_PROXY_ROUTE,
    handler: resolver.resolve('./runtime/server/api/customer-account/proxy'),
  })
}

export function warnInsecureCustomerAccountDevServer(nuxt: Nuxt) {
  onDevServerURL(nuxt, (origin) => {
    const { protocol, hostname } = new URL(origin)

    if (protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return

    useLogger().warn(
      `The dev server runs on ${origin}, but Shopify only signs customers in on HTTPS origins other than localhost, so customer account login will fail. `
      + 'Run the dev server with `localHttps` from `@shopify/hydrogen/vite`, which serves it on `https://local.tryhydrogen.dev:5173`',
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
    name: 'shopify:customer-account',
    path: resolver.resolve('./runtime/middleware/customer-account'),
    global: false,
  })

  addPlugin(resolver.resolve('./runtime/plugins/customer-account/session'))

  useLogger().debug('Registered customer account route middleware `shopify:customer-account`')
}

export function isPublicClient(storefront: ShopifyConfig['clients']['storefront']): boolean {
  return !!(storefront?.publicAccessToken || storefront?.mock)
}

export function hasPublicClient(config: ShopifyConfig): boolean {
  return isPublicClient(config.clients.storefront) || !!config.clients.customerAccount?.clientId
}

const PRESET_BUYER_IP_HEADERS: Array<[RegExp, string]> = [
  [/^vercel/, 'x-real-ip'],
  [/^netlify/, 'x-nf-client-connection-ip'],
  [/^cloudflare/, 'cf-connecting-ip'],
]

export function getPresetBuyerIpHeader(preset: string | undefined): string | undefined {
  return preset ? PRESET_BUYER_IP_HEADERS.find(([pattern]) => pattern.test(preset))?.[1] : undefined
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
