import { readFile } from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'
import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import {
    addTemplate,
    addTypeTemplate,
    updateTemplates,
} from '@nuxt/kit'
import defu from 'defu'
import { minimatch } from 'minimatch'
import type { ShopifyClientConfig, ShopifyTemplateOptions } from '../types'
import type { ShopifyClientType } from './config'

import {
    generateIntrospection,
    generateOperations,
    generateTypes,
    generateVirtualModule,
} from './codegen'

const indexTemplate = (client: string, types: string, operations: string) => () => `
export * from './${basename(client)}'
export * from './${basename(types)}'
export * from './${basename(operations)}'
`

export function setupWatcher(nuxt: Nuxt, template: NuxtTemplate<ShopifyTemplateOptions>) {
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

export function registerTemplates<T extends ShopifyClientType>(nuxt: Nuxt, clientType: T, clientConfig: ShopifyClientConfig) {
    const virtualModuleFilename = `types/${clientType}/${clientType}.client`
    const virtualModule = addTypeTemplate<Pick<ShopifyTemplateOptions, 'clientType'>>({
        filename: `${virtualModuleFilename}.d.ts`,
        getContents: generateVirtualModule,
        options: {
            clientType,
        },
    })

    const introspectionFilename = `schema/${clientType}.schema.json`
    const introspectionPath = join(nuxt.options.buildDir, introspectionFilename)
    const introspection = addTemplate<ShopifyTemplateOptions>({
        filename: introspectionFilename,
        getContents: generateIntrospection,
        options: {
            filename: introspectionFilename,
            clientType,
            clientConfig,
            introspection: introspectionPath,
        },
        write: true,
    })

    const typesFilename = `types/${clientType}/${clientType}.types`
    const types = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `${typesFilename}.d.ts`,
        getContents: generateTypes,
        options: {
            filename: `${typesFilename}.d.ts`,
            clientType,
            clientConfig,
            introspection: introspection.dst,
        },
    })

    const operationsFilename = `types/${clientType}/${clientType}.operations`
    const operations = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `${operationsFilename}.d.ts`,
        getContents: generateOperations,
        options: {
            clientType,
            clientConfig,
            filename: `${operationsFilename}.d.ts`,
            introspection: introspection.dst,
        },
    })

    setupWatcher(nuxt, operations)

    const index = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `types/${clientType}/index.d.ts`,
        getContents: indexTemplate(virtualModule.filename, types.filename, operations.filename),
    })

    nuxt.options = defu(nuxt.options, {
        alias: { [`#shopify/${clientType}`]: dirname(index.filename) },
        nitro: {
            typescript: {
                tsConfig: {
                    include: [index.filename],
                },
            },
        },
    })
}
