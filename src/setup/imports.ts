import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { join } from 'node:path'

import { useLogger } from '../utils/log'
import {
  registerFragmentImports,
  registerFunctionImports,
} from '../utils/imports'

export default function setupImports(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()

  nuxt.options.watch ||= []

  for (const dir of config.fragments.dirs) nuxt.options.watch.push(join(nuxt.options.rootDir, dir))

  if (config.fragments?.autoImport) {
    logger.debug(`Auto-importing fragments from \`${config.fragments.dirs.join('`, `')}\``)

    registerFragmentImports(nuxt, config)
  }

  registerFunctionImports(resolver)
}
