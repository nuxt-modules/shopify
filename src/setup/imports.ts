import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import {
  registerFragmentImports,
  registerFunctionImports,
} from '../utils/imports'

export default function setupImports(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()

  if (config.fragments?.autoImport) {
    logger.debug(`Auto-importing fragments from \`${config.fragments.dirs.join('`, `')}\``)

    registerFragmentImports(nuxt, config)
  }

  registerFunctionImports(resolver)
}
