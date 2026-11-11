import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  addImports,
  addImportsDir,
  addServerImports,
  addServerImportsDir,
} from '@nuxt/kit'

import { hasPublicClient } from '../utils/clients'
import { useLogger } from '../utils/log'

export default function setupImports(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()

  nuxt.options.watch ||= []

  for (const dir of config.fragments.dirs) nuxt.options.watch.push(join(nuxt.options.rootDir, dir))

  if (config.fragments.autoImport) {
    logger.debug(`Auto-importing fragments from \`${config.fragments.dirs.join('`, `')}\``)

    const includeClient = hasPublicClient(config)

    for (const dir of config.fragments.dirs) {
      const path = join(nuxt.options.rootDir, dir)

      if (!existsSync(path)) continue

      addServerImportsDir(join(path, '**'))

      if (includeClient) addImportsDir(join(path, '**'))
    }
  }

  const from = resolver.resolve('./runtime/utils/functions')
  const imports = [
    { from, name: 'flattenConnection' },
    { from, name: 'parseGid' },
  ]

  addServerImports(imports)
  addImports(imports)
}
