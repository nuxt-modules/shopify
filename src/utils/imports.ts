import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
    addImports,
    addImportsDir,
    addServerImports,
    addServerImportsDir,
    createResolver,
} from '@nuxt/kit'

import { ShopifyClientType } from '../schemas/config'

export function hasPublicClient(config: ShopifyConfig): boolean {
    const storefrontConfig = config.clients[ShopifyClientType.Storefront]

    return !!(storefrontConfig?.publicAccessToken || storefrontConfig?.mock)
}

export function autoImportDirectory(path: string, includeClient: boolean) {
    if (!existsSync(path)) return

    addServerImportsDir(join(path, '**'))

    if (includeClient) {
        addImportsDir(join(path, '**'))
    }
}

export function autoImportUtil(name: string, includeClient: boolean) {
    const resolver = createResolver(import.meta.url)

    const imports = [{
        from: resolver.resolve(`../runtime/utils/${name}`),
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
    const fragmentsPath = join(nuxt.options.rootDir, config.fragments.path)

    autoImportDirectory(fragmentsPath, includeClient)

    nuxt.options.watch = nuxt.options.watch || []
    nuxt.options.watch.push(fragmentsPath)
}

export function registerClientTypeImports(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType) {
    const clientConfig = config.clients[clientType]

    if (!clientConfig?.autoImport) return

    const includeClient = hasPublicClient(config)
    const typesPath = join(nuxt.options.buildDir, `types/${clientType}`)

    autoImportDirectory(typesPath, includeClient)
}

export function registerUtilImports(config: ShopifyConfig) {
    const includeClient = hasPublicClient(config)

    autoImportUtil('flattenConnection', includeClient)
}
