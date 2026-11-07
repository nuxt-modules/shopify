import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyClientType, ShopifyConfig } from '../types'
import type { ShopifyTemplateOptions } from './codegen'

import { readFile } from 'node:fs/promises'
import { dirname, basename, join, relative, resolve } from 'node:path'
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
  toPosix,
} from './codegen'
import { GRAPHQL_MARKER, SCHEMA_LANGUAGE_FILE } from './graphql/literals'

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
    const path = resolve(nuxt.options.srcDir, file)
    const projectPath = toPosix(relative(nuxt.options.rootDir, path))

    for (const document of template.options?.clientConfig?.documents ?? []) {
      if (document.startsWith('!') || !minimatch(projectPath, document)) continue

      const content = await readFile(path, 'utf8').catch(() => '')

      if (SCHEMA_LANGUAGE_FILE.test(path) || GRAPHQL_MARKER.test(content)) {
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

  const introspection = createIntrospectionGenerator({
    filename: introspectionFilename,
    shopName: config.name,
    clientType,
    clientConfig,
  }, introspectionPath)

  addTemplate({
    filename: introspectionFilename,
    getContents: introspection.getContents,
    write: true,
  })

  const typesFilename = `${OUTPUT_DIR}/${kebabCase(clientType)}/${kebabCase(clientType)}.types`
  const types = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${typesFilename}.d.ts`,
    getContents: createTypesGenerator(introspection),
    options: {
      filename: `${typesFilename}.d.ts`,
      shopName: config.name,
      clientType,
      clientConfig,
    },
  })

  const operationsFilename = `${OUTPUT_DIR}/${kebabCase(clientType)}/${kebabCase(clientType)}.operations`
  const operations = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${operationsFilename}.d.ts`,
    getContents: createOperationsGenerator(introspection),
    options: {
      filename: `${operationsFilename}.d.ts`,
      shopName: config.name,
      clientType,
      clientConfig,
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
