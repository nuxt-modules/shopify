import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Nuxt } from '@nuxt/schema'

import {
    addImports,
    addImportsDir,
    addServerImports,
    addServerImportsDir,
    type Resolver,
} from '@nuxt/kit'
import type { ShopifyConfig } from '../types'

import { useLog } from './log'

export function autoImportDir(path: string, client: boolean) {
    if (existsSync(path)) {
        addServerImportsDir(path)

        if (client) addImportsDir(path)
    }
}

export function autoImportUtil(name: string, resolver: Resolver, client: boolean) {
    const imports = [{
        from: resolver.resolve(`./runtime/utils/${name}`),
        name: name,
    }]

    addServerImports(imports)

    if (client) addImports(imports)
}

export function registerUtilImports(resolver: Resolver, client = false) {
    autoImportUtil('flattenConnection', resolver, client)
}

export function registerAutoImports(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const usesClientSide = (config.clients.storefront?.publicAccessToken?.length ?? 0) > 0

    if (config.autoImports?.graphql) {
        autoImportDir(join(nuxt.options.rootDir, 'graphql'), usesClientSide)
        useLog().debug('Auto-importing GraphQL from `~/graphql` directory')
    }

    if (config.autoImports?.storefront) {
        autoImportDir(join(nuxt.options.buildDir, 'types/storefront'), usesClientSide)
        useLog().debug('Auto-importing Storefront types')
    }

    if (config.autoImports?.admin) {
        autoImportDir(join(nuxt.options.buildDir, 'types/admin'), usesClientSide)
        useLog().debug('Auto-importing Admin types')
    }

    registerUtilImports(resolver, usesClientSide)
}
