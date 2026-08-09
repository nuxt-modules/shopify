import type { Nuxt } from '@nuxt/schema'
import type { ViteDevServer } from 'vite'

import type { FragmentRegistry } from '../utils/graphql/registry'
import type { ShopifyConfig } from '../types'

import { join, relative, resolve, sep } from 'node:path'

import { addVitePlugin } from '@nuxt/kit'
import { minimatch } from 'minimatch'

import { ShopifyClientType } from '../schemas'
import { createGraphqlTransformPlugin } from '../utils/graphql/transform'
import { getConfiguredClients } from '../utils/clients'
import { scanFragments } from '../utils/graphql/registry'
import { useLogger } from '../utils/log'

const ROUTING_ORDER = [
  ShopifyClientType.Admin,
  ShopifyClientType.CustomerAccount,
  ShopifyClientType.Storefront,
]

const AUTO_IMPORT_CHANGING_EVENTS = ['add', 'unlink'] as const

const toPosix = (path: string) => path.split(sep).join('/')

const within = (dirs: string[], path: string) =>
  dirs.some(dir => path === dir || path.startsWith(dir + sep))

function createClientRouter(nuxt: Nuxt, config: ShopifyConfig) {
  const configured = getConfiguredClients(config)

  const order = ROUTING_ORDER
    .filter(clientType => configured.includes(clientType))
    .map(clientType => ({
      clientType,
      include: (config.clients[clientType]?.documents ?? []).filter(entry => !entry.startsWith('!')),
      exclude: (config.clients[clientType]?.documents ?? []).filter(entry => entry.startsWith('!')).map(entry => entry.slice(1)),
    }))

  return (file: string) => {
    const path = toPosix(relative(nuxt.options.rootDir, file))

    if (!path || path.startsWith('..')) return undefined

    const segments = path.split('/')

    for (const { clientType, include, exclude } of order) {
      if (!include.some(pattern => minimatch(path, pattern))) continue
      if (exclude.some(pattern => segments.includes(pattern) || minimatch(path, pattern))) continue

      return clientType
    }
  }
}

export function touchesFragments(dirs: string[], file: string, srcDir: string, rootDir: string) {
  const resolvedAgainstEachBase = [resolve(srcDir, file), resolve(rootDir, file)]

  return resolvedAgainstEachBase.some(path => within(dirs, path))
}

export default async function setupGraphqlTransform(nuxt: Nuxt, config: ShopifyConfig) {
  const logger = useLogger()

  if (!config.graphql.injectFragments) {
    logger.debug('Skipping fragment injection: `graphql.injectFragments` is disabled')
    return
  }

  const routeFile = createClientRouter(nuxt, config)
  const dirs = config.fragments.dirs.map(dir => join(nuxt.options.rootDir, dir))

  let registries = new Map<string, FragmentRegistry>()

  const rebuild = async () => {
    registries = await scanFragments(dirs, routeFile)

    const summary = [...registries]
      .map(([clientType, registry]) => `${clientType}: ${registry.fragments.size}`)
      .join(', ')

    logger.debug(`Indexed fragments for build-time injection (${summary || 'none'})`)
  }

  await rebuild()

  const transformed = new Set<string>()

  let server: ViteDevServer | undefined

  function invalidateTransformedModules() {
    if (!server) return

    for (const id of transformed) {
      for (const environment of Object.values(server.environments ?? {})) {
        for (const module of environment.moduleGraph.getModulesByFile(id) ?? []) {
          environment.moduleGraph.invalidateModule(module)
        }
      }

      for (const module of server.moduleGraph.getModulesByFile(id) ?? []) {
        server.moduleGraph.invalidateModule(module)
      }
    }

    server.ws.send({ type: 'full-reload' })
  }

  const base = createGraphqlTransformPlugin({
    resolveRegistry: (file) => {
      const clientType = routeFile(file)

      return clientType ? registries.get(clientType) : undefined
    },
  })

  const plugin = {
    ...base,

    transform(code: string, id: string) {
      const result = base.transform(code, id)

      if (result) transformed.add(id.split('?')[0]!)

      return result
    },

    configureServer(devServer: ViteDevServer) {
      server = devServer

      for (const dir of dirs) devServer.watcher.add(dir)

      devServer.watcher.on('change', async (file) => {
        if (!within(dirs, file)) return

        await rebuild()

        invalidateTransformedModules()
      })

      for (const event of AUTO_IMPORT_CHANGING_EVENTS) {
        devServer.watcher.on(event, (file) => {
          if (within(dirs, file)) nuxt.callHook('restart')
        })
      }
    },
  }

  addVitePlugin(plugin)

  nuxt.hook('nitro:config', (nitroConfig) => {
    nitroConfig.rollupConfig ??= {}
    nitroConfig.rollupConfig.plugins ??= []

    if (Array.isArray(nitroConfig.rollupConfig.plugins)) {
      nitroConfig.rollupConfig.plugins.push(plugin)
    }
  })

  nuxt.hook('builder:watch', async (_event, file) => {
    if (!touchesFragments(dirs, file, nuxt.options.srcDir, nuxt.options.rootDir)) return

    await rebuild()

    invalidateTransformedModules()
  })
}
