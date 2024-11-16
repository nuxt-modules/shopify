import type {
    ShopifyClientType,
    ShopifyClientConfig,
    ShopifyTypeTemplateOptions,
} from '../types'
import type { Nuxt } from '@nuxt/schema'

import { addTemplate, addTypeTemplate } from '@nuxt/kit'
import defu from 'defu'
import { dirname, basename } from 'node:path'

import {
    generateIntrospection,
    generateOperations,
    generateTypes,
} from './codegen'

export function registerTemplates<T extends ShopifyClientType>(nuxt: Nuxt, clientType: T, clientConfig: ShopifyClientConfig) {
    addTemplate<ShopifyTypeTemplateOptions>({
        filename: `schema/${clientType}.schema.json`,
        getContents: generateIntrospection,
        options: {
            clientType,
            clientConfig,
        },
        write: true,
    })

    const types = addTypeTemplate<ShopifyTypeTemplateOptions>({
        filename: `types/${clientType}/${clientType}.types.d.ts`,
        getContents: generateTypes,
        options: {
            clientType,
            clientConfig,
        },
    })

    const operations = addTypeTemplate<ShopifyTypeTemplateOptions>({
        filename: `types/${clientType}/${clientType}.operations.d.ts`,
        getContents: generateOperations,
        options: {
            clientType,
            clientConfig,
        },
    })

    const index = addTypeTemplate<ShopifyTypeTemplateOptions>({
        filename: `types/${clientType}/index.d.ts`,
        getContents: () => `export * from './${basename(types.filename)}'\nexport * from './${basename(operations.filename)}'\n`,
        options: {
            clientType,
            clientConfig,
        },
    })

    nuxt.options.nitro.alias = defu(nuxt.options.nitro.alias, {
        [`#shopify/${clientType}`]: dirname(index.filename),
    })
}
