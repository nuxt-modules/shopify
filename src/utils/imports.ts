import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyClientType, ShopifyConfig } from '../types'

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

function autoImportUtil(name: string, includeClient: boolean, resolver: Resolver) {
    const imports = [{
        from: resolver.resolve(`./runtime/utils/${name}`),
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
    nuxt.options.watch = nuxt.options.watch || []

    for (const path of config.fragments.paths) {
        const fragmentsPath = join(nuxt.options.rootDir, path)

        autoImportDirectory(fragmentsPath, includeClient)

        nuxt.options.watch.push(fragmentsPath)
    }
}

export function registerClientTypeImports(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType) {
    const clientConfig = config.clients[clientType]

    if (!clientConfig?.autoImport) return

    const includeClient = hasPublicClient(config)
    const typesPath = join(nuxt.options.buildDir, `types/${clientType}`)

    autoImportDirectory(typesPath, includeClient)
}

export function registerUtilImports(config: ShopifyConfig, resolver: Resolver) {
    const includeClient = hasPublicClient(config)

    autoImportUtil('flattenConnection', includeClient, resolver)
}
