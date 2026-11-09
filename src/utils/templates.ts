import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyClientType, ShopifyConfig } from '../types'
import type { DocumentState, ShopifyTemplateOptions } from './codegen'

import { readFile } from 'node:fs/promises'
import { dirname, basename, join, resolve } from 'node:path'
import {
  addTemplate,
  addTypeTemplate,
  getLayerDirectories,
  updateTemplates,
} from '@nuxt/kit'
import { relative } from 'pathe'
import { kebabCase } from 'scule'

import { createDocumentMatcher } from './clients'
import {
  createIntrospectionGenerator,
  createTypesGenerator,
  createOperationsGenerator,
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

function watchDocuments(nuxt: Nuxt, template: NuxtTemplate<ShopifyTemplateOptions>, documents: DocumentState) {
  const matches = createDocumentMatcher(template.options?.clientConfig?.documents ?? [])

  nuxt.options.watch ||= []

  for (const { shared } of getLayerDirectories(nuxt)) {
    if (!nuxt.options.watch.includes(shared)) nuxt.options.watch.push(shared)
  }

  nuxt.hook('builder:watch', async (_event, file) => {
    const path = resolve(nuxt.options.srcDir, file)

    if (!matches(relative(nuxt.options.rootDir, path))) return

    const content = await readFile(path, 'utf8').catch(() => '')
    const hasGraphql = SCHEMA_LANGUAGE_FILE.test(path) || GRAPHQL_MARKER.test(content)

    if (!hasGraphql && !documents.graphqlFiles.has(path)) return

    if (hasGraphql) documents.graphqlFiles.add(path)
    else documents.graphqlFiles.delete(path)

    documents.revision++

    return updateTemplates({
      filter: t => t.filename === template.options?.filename,
    })
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

  const context = { nuxt: true, nitro: true, node: true }

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
  }, context)

  const documents: DocumentState = { revision: 0, graphqlFiles: new Set() }

  const operationsFilename = `${OUTPUT_DIR}/${kebabCase(clientType)}/${kebabCase(clientType)}.operations`
  const operations = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${operationsFilename}.d.ts`,
    getContents: createOperationsGenerator(introspection, documents),
    options: {
      filename: `${operationsFilename}.d.ts`,
      shopName: config.name,
      clientType,
      clientConfig,
    },
  }, context)

  watchDocuments(nuxt, operations, documents)

  const index = addTypeTemplate<ShopifyTemplateOptions>({
    filename: `${OUTPUT_DIR}/${kebabCase(clientType)}/index.d.ts`,
    getContents: () => indexTemplate(types.filename, operations.filename).trimStart(),
  }, context)

  nuxt.options.alias[`#shopify/${kebabCase(clientType)}`] ??= `./${dirname(index.filename)}`
}
