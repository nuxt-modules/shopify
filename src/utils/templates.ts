import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyClientType, ShopifyConfig } from '../types'
import type { ShopifyTemplateOptions } from './codegen'

import { readFile } from 'node:fs/promises'
import { dirname, basename, join, resolve } from 'node:path'
import {
  addTemplate,
  addTypeTemplate,
  updateTemplates,
} from '@nuxt/kit'
import { minimatch } from 'minimatch'
import { kebabCase } from 'scule'

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

const OUTPUT_DIR = 'shopify'

export function getIntrospectionFilename(clientType: ShopifyClientType, apiVersion: string) {
  return `${OUTPUT_DIR}/schema/${kebabCase(clientType)}.${apiVersion}.schema.json`
}

function setupWatcher(nuxt: Nuxt, template: NuxtTemplate<ShopifyTemplateOptions>) {
  nuxt.hook('builder:watch', async (_event, file) => {
    for (const document of template.options?.clientConfig?.documents ?? []) {
      if (document.startsWith('!') || !minimatch(file, document)) continue

      const content = await readFile(resolve(nuxt.options.srcDir, file), 'utf8')
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

  const introspectionFilename = getIntrospectionFilename(clientType, clientConfig.apiVersion)
  const introspectionPath = join(nuxt.options.buildDir, introspectionFilename)

  const introspection = addTemplate<ShopifyTemplateOptions>({
    filename: introspectionFilename,
    getContents: createIntrospectionGenerator(),
    options: {
      filename: introspectionFilename,
      shopName: config.name,
      clientType,
      clientConfig,
      introspection: introspectionPath,
    },
    write: true,
  })

  const typesFilename = `${OUTPUT_DIR}/${kebabCase(clientType)}/${kebabCase(clientType)}.types`
  const types = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${typesFilename}.d.ts`,
    getContents: createTypesGenerator(),
    options: {
      filename: `${typesFilename}.d.ts`,
      shopName: config.name,
      clientType,
      clientConfig,
      introspection: introspection.dst,
    },
  })

  const operationsFilename = `${OUTPUT_DIR}/${kebabCase(clientType)}/${kebabCase(clientType)}.operations`
  const operations = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${operationsFilename}.d.ts`,
    getContents: createOperationsGenerator(),
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
    filename: `${OUTPUT_DIR}/${kebabCase(clientType)}/index.d.ts`,
    getContents: () => indexTemplate(types.filename, operations.filename).trimStart(),
  })

  const typesDir = `./${dirname(index.filename)}`

  nuxt.options.alias[`#shopify/${kebabCase(clientType)}`] ??= typesDir

  const typescript = nuxt.options.nitro.typescript ??= {}
  const tsConfig = typescript.tsConfig ??= {}

  tsConfig.include = [...tsConfig.include ?? [], typesDir]

  nuxt.hook('prepare:types', ({ nodeTsConfig }) => {
    if (!nodeTsConfig) return

    nodeTsConfig.include = [...nodeTsConfig.include ?? [], typesDir]
  })
}
