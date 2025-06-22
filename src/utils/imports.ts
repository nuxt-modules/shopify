import type { ShopifyConfig } from '../types'
import type { Nuxt } from '@nuxt/schema'

import {
    addImportsDir,
    addServerImportsDir,
} from '@nuxt/kit'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { useLog } from './log'

export function autoImportDir(path: string) {
    if (existsSync(path)) {
        addImportsDir(path)
        addServerImportsDir(path)
    }
}

export function registerAutoImports(nuxt: Nuxt, config: ShopifyConfig) {
    if (config.autoImports?.graphql) {
        autoImportDir(join(nuxt.options.rootDir, 'graphql'))
        useLog().debug('Auto-importing GraphQL from `~/graphql` directory')
    }

    if (config.autoImports?.storefront) {
        autoImportDir(join(nuxt.options.buildDir, 'types/storefront'))
        useLog().debug('Auto-importing Storefront types')
    }

    if (config.autoImports?.admin) {
        autoImportDir(join(nuxt.options.buildDir, 'types/admin'))
        useLog().debug('Auto-importing Admin types')
    }
}
