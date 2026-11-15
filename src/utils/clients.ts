import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { glob } from 'node:fs/promises'
import {
  addImports,
  addNitroPlugin,
  addPlugin,
  addServerHandler,
  addServerImports,
} from '@nuxt/kit'
import { Minimatch } from 'minimatch'
import { join, relative } from 'pathe'
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

const GLOB_MAGIC = /[*?[{]/

export function splitDocuments(documents: string[]) {
  return {
    include: documents.filter(entry => !entry.startsWith('!')),
    exclude: documents.filter(entry => entry.startsWith('!')).map(entry => entry.slice(1)),
  }
}

const toGlob = (entry: string) => entry.replace(/\\/g, '/').replace(/^\.\//, '')

function toDocumentGlobs(documents: string[]) {
  const { include, exclude } = splitDocuments(documents)

  return {
    include: include.map(toGlob).flatMap(pattern => GLOB_MAGIC.test(pattern) ? [pattern] : [pattern, `${pattern}/**`]),
    exclude: exclude.map(toGlob),
  }
}

export function createDocumentMatcher(documents: string[]) {
  const { include, exclude } = toDocumentGlobs(documents)
  const included = include.map(pattern => new Minimatch(pattern))
  const excluded = exclude.map(pattern => new Minimatch(pattern))

  return (path: string) => {
    const folders = [...path.matchAll(/\//g)].flatMap(({ index }) => [path.slice(0, index), path.slice(0, index + 1)])

    return included.some(pattern => pattern.match(path)) && ![...folders, path].some(entry => excluded.some(pattern => pattern.match(entry)))
  }
}

export async function findDocuments(documents: string[], cwd: string) {
  const { include, exclude } = toDocumentGlobs(documents)
  const paths: string[] = []

  for await (const entry of glob(include, { cwd, exclude, withFileTypes: true })) {
    if (entry.isFile()) paths.push(relative(cwd, join(entry.parentPath, entry.name)))
  }

  return paths.sort()
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
  addNitroPlugin(resolver.resolve('./runtime/server/plugins/response-headers'))

  const storefront = !!(config.clients.storefront?.routes || config.analytics)

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
