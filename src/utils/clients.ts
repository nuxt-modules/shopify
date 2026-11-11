import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { MinimatchOptions } from 'minimatch'

import type { ShopifyConfig } from '../types'

import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerImports,
  addServerPlugin,
} from '@nuxt/kit'
import { Minimatch, braceExpand } from 'minimatch'
import { relative } from 'pathe'
import { kebabCase, pascalCase } from 'scule'

import { ShopifyClientType } from '../schemas'
import { CUSTOMER_ACCOUNT_ROUTES } from '../runtime/utils/session'
import { STOREFRONT_ROUTES, keepUncached } from './routes'

type ConfiguredClient = {
  [T in ShopifyClientType]: {
    clientType: T
    clientConfig: NonNullable<ShopifyConfig['clients'][T]>
  }
}[ShopifyClientType]

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

export function createClientRouter(nuxt: Nuxt, config: ShopifyConfig) {
  const order = DOCUMENT_ROUTING_ORDER.flatMap((clientType) => {
    const clientConfig = config.clients[clientType]

    return clientConfig ? [{ clientType, matches: createDocumentMatcher(clientConfig.documents) }] : []
  })

  return (file: string) => {
    const path = relative(nuxt.options.rootDir, file)

    if (!path || path.startsWith('..')) return undefined

    return order.find(({ matches }) => matches(path))?.clientType
  }
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

export function isPublicClient(storefront: ShopifyConfig['clients']['storefront']): boolean {
  return !!(storefront?.publicAccessToken || storefront?.mock)
}

export function hasPublicClient(config: ShopifyConfig): boolean {
  return isPublicClient(config.clients.storefront) || !!config.clients.customerAccount
}

export function getConfiguredClients(config: ShopifyConfig): ConfiguredClient[] {
  return Object.values(ShopifyClientType).flatMap(clientType => config.clients[clientType] ? [{ clientType, clientConfig: config.clients[clientType] } as ConfiguredClient] : [])
}

export type { ConfiguredClient }
