import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyClientType, ShopifyConfig } from '../types'
import type { ShopifyTemplateOptions } from './codegen'

import { readFile } from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'
import {
    addTemplate,
    addTypeTemplate,
    updateTemplates,
} from '@nuxt/kit'
import defu from 'defu'
import { minimatch } from 'minimatch'

import {
    createIntrospectionGenerator,
    createTypesGenerator,
    createOperationsGenerator,
} from './codegen'

function indexTemplate(types: string, operations: string) {
    return `
export * from './${basename(types)}'
export * from './${basename(operations)}'
`
}

function setupWatcher(nuxt: Nuxt, template: NuxtTemplate<ShopifyTemplateOptions>) {
    nuxt.hook('builder:watch', async (_event, file) => {
        for (const document of template.options?.clientConfig?.documents ?? []) {
            if (!minimatch(file, document)) continue

            const content = await readFile(join(nuxt.options.srcDir, file), 'utf8')
                .catch(() => '')

            if (
                file.endsWith('.gql')
                || file.endsWith('.graphql')
                || content.includes('#graphql')
                || content.includes('/* GraphQL */')
            ) {
                return updateTemplates({
                    filter: t => t.filename === template.options?.filename,
                })
            }
        }
    })
}

export function registerTemplates(
    nuxt: Nuxt,
    config: ShopifyConfig,
    clientType: ShopifyClientType,
) {
    const clientConfig = config.clients[clientType]

    if (!clientConfig) return

    const introspectionFilename = `schema/${clientType}.schema.json`
    const introspectionPath = join(nuxt.options.buildDir, introspectionFilename)

    const introspection = addTemplate<ShopifyTemplateOptions>({
        filename: introspectionFilename,
        getContents: createIntrospectionGenerator(config),
        options: {
            filename: introspectionFilename,
            shopName: config.name,
            clientType,
            clientConfig,
            introspection: introspectionPath,
        },
        write: true,
    })

    const typesFilename = `types/${clientType}/${clientType}.types`
    const types = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `${typesFilename}.d.ts`,
        getContents: createTypesGenerator(config),
        options: {
            filename: `${typesFilename}.d.ts`,
            shopName: config.name,
            clientType,
            clientConfig,
            introspection: introspection.dst,
        },
    })

    const operationsFilename = `types/${clientType}/${clientType}.operations`
    const operations = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `${operationsFilename}.d.ts`,
        getContents: createOperationsGenerator(config),
        options: {
            filename: `${operationsFilename}.d.ts`,
            shopName: config.name,
            clientType,
            clientConfig,
            introspection: introspection.dst,
        },
    })

    setupWatcher(nuxt, operations)

    const index = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `types/${clientType}/index.d.ts`,
        getContents: () => indexTemplate(types.filename, operations.filename).trimStart(),
    })

    nuxt.options = defu(nuxt.options, {
        alias: {
            [`#shopify/${clientType}`]: `./${dirname(index.filename)}`,
        },
        nitro: {
            typescript: {
                tsConfig: {
                    include: [
                        `./${dirname(index.filename)}`,
                    ],
                },
            },
        },
    })
}
