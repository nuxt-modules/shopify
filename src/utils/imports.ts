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

import { hasPublicClient } from './clients'

function autoImportDirectory(path: string, includeClient: boolean) {
  if (!existsSync(path)) return

  addServerImportsDir(join(path, '**'))

  if (includeClient) {
    addImportsDir(join(path, '**'))
  }
}

export function registerFragmentImports(nuxt: Nuxt, config: ShopifyConfig) {
  const includeClient = hasPublicClient(config)

  for (const dir of config.fragments.dirs) {
    autoImportDirectory(join(nuxt.options.rootDir, dir), includeClient)
  }
}

export function registerFunctionImports(resolver: Resolver) {
  const from = resolver.resolve('./runtime/utils/functions')
  const imports = [
    { from, name: 'flattenConnection' },
    { from, name: 'parseGid' },
  ]

  addServerImports(imports)
  addImports(imports)
}
