import type { Nuxt } from '@nuxt/schema'
import type { NitroConfig } from 'nitropack'
import type { ViteDevServer } from 'vite'

import type { FragmentRegistry } from '../utils/graphql/registry'
import type { ShopifyConfig } from '../types'

import { join } from 'node:path'

import { addVitePlugin } from '@nuxt/kit'

import { createGraphqlTransformPlugin } from '../utils/graphql/transform'
import { createClientRouter } from '../utils/clients'
import { createRegistry, scanFragments, within } from '../utils/graphql/registry'
import { useLogger } from '../utils/log'

const AUTO_IMPORT_CHANGING_EVENTS = ['add', 'unlink'] as const

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

  let scheduled: Promise<void> | undefined
  let scanning: Promise<void> = Promise.resolve()

  const scan = () => {
    scheduled = undefined

    return scanning = rebuild()
  }

  const plugin = {
    ...createGraphqlTransformPlugin({
      resolveRegistry: (file) => {
        const clientType = routeFile(file)

        return clientType ? registries.get(clientType) ?? createRegistry() : undefined
      },
    }),

    watchChange(id: string) {
      if (!within(dirs, id)) return

      return scheduled ??= scanning.then(scan, scan)
    },

    configureServer(devServer: ViteDevServer) {
      for (const dir of dirs) devServer.watcher.add(dir)

      for (const event of AUTO_IMPORT_CHANGING_EVENTS) {
        devServer.watcher.on(event, (file) => {
          if (within(dirs, file)) nuxt.callHook('restart')
        })
      }
    },
  }

  addVitePlugin(plugin)

  nuxt.hook('nitro:config', (serverConfig) => {
    const nitroConfig = serverConfig as NitroConfig

    nitroConfig.rollupConfig ??= {}
    nitroConfig.rollupConfig.plugins ??= []

    if (Array.isArray(nitroConfig.rollupConfig.plugins)) {
      nitroConfig.rollupConfig.plugins.push(plugin)
    }
  })
}
