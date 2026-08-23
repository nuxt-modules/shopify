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

function autoImportFunction(name: string, includeClient: boolean, resolver: Resolver) {
  const imports = [{
    from: resolver.resolve(`./runtime/utils/functions/${name}`),
    name,
  }]

  addServerImports(imports)

  if (includeClient) {
    addImports(imports)
  }
}

export function registerFragmentImports(nuxt: Nuxt, config: ShopifyConfig) {
  if (!config.fragments?.autoImport) return

  const includeClient = hasPublicClient(config)
  const watchedByGraphqlTransform = config.graphql.injectFragments

  nuxt.options.watch = nuxt.options.watch || []

  for (const dir of config.fragments.dirs) {
    const fragmentsPath = join(nuxt.options.rootDir, dir)

    autoImportDirectory(fragmentsPath, includeClient)

    if (!watchedByGraphqlTransform) {
      nuxt.options.watch.push(fragmentsPath)
    }
  }
}

export function registerFunctionImports(config: ShopifyConfig, resolver: Resolver) {
  const includeClient = hasPublicClient(config)

  const functionNames = [
    'flattenConnection',
    'parseGid',
  ]

  for (const name of functionNames) {
    autoImportFunction(name, includeClient, resolver)
  }
}
