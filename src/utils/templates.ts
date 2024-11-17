import type {
    ShopifyClientType,
    ShopifyClientConfig,
    ShopifyTemplateOptions,
} from '../types'
import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import {
    addTemplate,
    addTypeTemplate,
    updateTemplates,
} from '@nuxt/kit'
import defu from 'defu'
import { minimatch } from 'minimatch'
import { readFile } from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'

import {
    generateIntrospection,
    generateOperations,
    generateTypes,
} from './codegen'

// wip
export function setupWatcher(nuxt: Nuxt, template: NuxtTemplate<ShopifyTemplateOptions>) {
    nuxt.hook('builder:watch', async (_event, file) => {
        for (const document of template.options?.clientConfig?.documents ?? []) {
            if (minimatch(file, document)) {
                const content = await readFile(join(nuxt.options.srcDir, file), 'utf8')
                    .catch(() => '')

                if (content.includes('#graphql') || file.endsWith('.gql') || file.endsWith('.graphql')) {
                    return updateTemplates({
                        filter: t => t.filename === template.options?.filename,
                    })
                }
            }
        }
    })
}

export function registerTemplates<T extends ShopifyClientType>(nuxt: Nuxt, clientType: T, clientConfig: ShopifyClientConfig) {
    const introspectionFilename = `schema/${clientType}.schema.json`
    const introspection = addTemplate<ShopifyTemplateOptions>({
        filename: introspectionFilename,
        getContents: generateIntrospection,
        options: {
            filename: introspectionFilename,
            clientType,
            clientConfig,
        },
        write: true,
    })

    const typesFilename = `types/${clientType}/${clientType}.types.d.ts`
    const types = addTypeTemplate<ShopifyTemplateOptions>({
        // @ts-expect-error wrong evaluation
        filename: typesFilename,
        getContents: generateTypes,
        options: {
            filename: typesFilename,
            clientType,
            clientConfig,
            introspection: introspection.dst,
        },
    })

    const operationsFilename = `types/${clientType}/${clientType}.operations.d.ts`
    const operations = addTypeTemplate<ShopifyTemplateOptions>({
        // @ts-expect-error wrong evaluation
        filename: operationsFilename,
        getContents: generateOperations,
        options: {
            clientType,
            clientConfig,
            filename: operationsFilename,
            introspection: introspection.dst,
        },
    })

    setupWatcher(nuxt, operations)

    const index = addTypeTemplate<ShopifyTemplateOptions>({
        filename: `types/${clientType}/index.d.ts`,
        getContents: () => `export * from './${basename(types.filename)}'\nexport * from './${basename(operations.filename)}'\n`,
    })

    nuxt.options.nitro.alias = defu(nuxt.options.nitro.alias, {
        [`#shopify/${clientType}`]: dirname(index.filename),
    })
}
