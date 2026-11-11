import type { Types } from '@graphql-codegen/plugin-helpers'
import type { Nuxt } from '@nuxt/schema'

import type { ConfiguredClient } from './clients'

import { existsSync, statSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { getLayerDirectories, updateTemplates } from '@nuxt/kit'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { resolveModulePath, resolveModuleURL } from 'exsolve'
import { relative } from 'pathe'
import { kebabCase, upperFirst } from 'scule'
import defu from 'defu'

import { ShopifyClientType } from '../schemas'
import { createDocumentMatcher, splitDocuments } from './clients'
import { GRAPHQL_MARKER, SCHEMA_LANGUAGE_FILE } from './graphql/literals'
import { useLogger } from './log'
import { createAdminConfig } from '../runtime/utils/clients/admin'
import { getAdminAccessToken } from '../runtime/utils/clients/admin/auth'
import { DEFAULT_API_VERSION, REQUEST_TIMEOUT_MS } from '../runtime/utils/clients/defaults'
import { createStorefrontConfig } from '../runtime/utils/clients/storefront'
import { ADMIN_TOKEN_HEADER } from '../runtime/utils/clients/transport'

const HYDROGEN = '@shopify/hydrogen'

const HYDROGEN_SCHEMAS: Partial<Record<ShopifyClientType, string>> = {
  [ShopifyClientType.Storefront]: `${HYDROGEN}/storefront.schema.json`,
  [ShopifyClientType.CustomerAccount]: `${HYDROGEN}/customer-account.schema.json`,
}

const INTROSPECTION_ATTEMPTS = 3
const INTROSPECTION_RETRY_DELAY = 5000

const TRANSPORT_ERROR_PATTERN = /\b(?:ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH)\b|socket hang up|other side closed|fetch failed|Timeout Error|aborted due to timeout/

const EXACT_UTILITY_TYPE = 'export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };'

const EXPORTED_TYPE_PATTERN = /^export type (\w+) =/gm

const generateFailures = new WeakMap<Nuxt, string[]>()

type CodegenClient = ConfiguredClient & {
  shopName: string
}

type SchemaLoader = () => Promise<string | undefined>

type DocumentState = {
  revision: number
  graphqlFiles: Set<string>
}

type InterfaceExtensionsParams = {
  queryType: string
  mutationType: string
}

export const OUTPUT_DIR = 'shopify'

export function getIntrospectionFilename(clientType: ShopifyClientType, apiVersion: string) {
  return `${OUTPUT_DIR}/schema/${kebabCase(clientType)}.${apiVersion}.schema.json`
}

export function getGenerateFailures(nuxt: Nuxt): string[] {
  return generateFailures.get(nuxt) ?? []
}

function reportGenerateFailure(nuxt: Nuxt, filename: string, error: unknown): '' {
  const message = `Failed to generate \`${filename}\`: ${(error as Error).message}`

  useLogger().error(`${message}\nTypes for this client are unavailable`)

  generateFailures.set(nuxt, [...getGenerateFailures(nuxt), message])

  return ''
}

function getHydrogenSchema(clientType: ShopifyClientType) {
  const schemaId = HYDROGEN_SCHEMAS[clientType]
  const schemaPath = schemaId && resolveModulePath(schemaId, { from: import.meta.url, try: true })

  return schemaPath ? [schemaPath] : undefined
}

function isHydrogenSchema(schema: Types.ConfiguredOutput['schema'], clientType: ShopifyClientType) {
  const [hydrogenSchema] = getHydrogenSchema(clientType) ?? []

  return !!hydrogenSchema && [schema].flat().includes(hydrogenSchema)
}

function warnOnHydrogenSchemaMismatch({ clientType, clientConfig: { apiVersion } }: CodegenClient) {
  if (apiVersion === DEFAULT_API_VERSION) return

  useLogger().warn(
    `The ${kebabCase(clientType)} types are generated from the \`${HYDROGEN}\` schema for API version \`${DEFAULT_API_VERSION}\`, `
    + `but the client uses \`${apiVersion}\`. Set \`clients.${clientType}.apiVersion\` to \`${DEFAULT_API_VERSION}\` to match them`,
  )
}

function isRemoteSchema(schema: Types.ConfiguredOutput['schema']) {
  return Array.isArray(schema) && schema.length > 0 && schema.every(pointer => typeof pointer === 'object')
}

function isTransportError(error: unknown): boolean {
  const messages = [error, ...(error as AggregateError)?.errors ?? []].map(cause => (cause as Error)?.message ?? String(cause))

  return TRANSPORT_ERROR_PATTERN.test(messages.join('\n'))
}

const fallbackMarker = (path: string) => `${path}.fallback`

async function generateFile(nuxt: Nuxt, filename: string, config: Types.ConfiguredOutput, extra?: Partial<Types.Config> & { cwd?: string }) {
  const [file] = await generate({
    overwrite: true,
    pluginLoader: (name: string) => import(resolveModuleURL(name, { from: [import.meta.url, nuxt.options.rootDir], cache: false })),
    ignoreNoDocuments: true,
    silent: useLogger().level < LogLevels.verbose,
    generates: { [filename]: config },
    ...extra,
  }, false)

  return file?.content ?? ''
}

async function introspect(nuxt: Nuxt, client: CodegenClient, filename: string, config: Types.ConfiguredOutput) {
  const remote = isRemoteSchema(config.schema)

  for (let attempt = 1; ; attempt++) {
    try {
      return { contents: await generateFile(nuxt, filename, config), fallback: false }
    }
    catch (error) {
      if (remote && isTransportError(error) && attempt < INTROSPECTION_ATTEMPTS) {
        useLogger().warn(`Introspection attempt ${attempt} failed, retrying: ${(error as Error).message}`)

        await new Promise(resolve => setTimeout(resolve, INTROSPECTION_RETRY_DELAY * attempt))

        continue
      }

      const schema = remote ? getHydrogenSchema(client.clientType) : undefined

      if (!schema) throw error

      useLogger().warn(`Failed to introspect the ${kebabCase(client.clientType)} API, falling back to the schema from \`${HYDROGEN}\`: ${(error as Error).message}`)

      warnOnHydrogenSchemaMismatch(client)

      return { contents: await generateFile(nuxt, filename, { ...config, schema }), fallback: true }
    }
  }
}

async function getIntrospectionSource({ shopName, clientType, clientConfig }: CodegenClient) {
  if (clientType === ShopifyClientType.CustomerAccount || (clientType === ShopifyClientType.Storefront && clientConfig.apiVersion === DEFAULT_API_VERSION)) {
    return getHydrogenSchema(clientType)
  }

  if (clientType === ShopifyClientType.Storefront) {
    const { apiUrl, headers } = createStorefrontConfig({ name: shopName, clients: { storefront: clientConfig } })

    return [{ [apiUrl]: { headers: headers as Record<string, string>, timeout: REQUEST_TIMEOUT_MS } }]
  }

  const { apiUrl, headers } = createAdminConfig({ name: shopName, clients: { admin: clientConfig } })

  return [{ [apiUrl]: { headers: { ...headers as Record<string, string>, [ADMIN_TOKEN_HEADER]: await getAdminAccessToken(shopName, clientConfig) }, timeout: REQUEST_TIMEOUT_MS } }]
}

async function loadSchema(nuxt: Nuxt, client: CodegenClient) {
  const filename = getIntrospectionFilename(client.clientType, client.clientConfig.apiVersion)
  const path = join(nuxt.options.buildDir, filename)

  if (statSync(path, { throwIfNoEntry: false })?.size && !existsSync(fallbackMarker(path))) return path

  try {
    const config = { schema: await getIntrospectionSource(client), plugins: [{ introspection: { minify: true } }] }

    await nuxt.callHook(`shopify:${kebabCase(client.clientType)}:generate:introspection`, { nuxt, config })

    if (isHydrogenSchema(config.schema, client.clientType)) warnOnHydrogenSchemaMismatch(client)

    const { contents, fallback } = await introspect(nuxt, client, filename, config)

    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents)
    await (fallback ? writeFile(fallbackMarker(path), '') : rm(fallbackMarker(path), { force: true }))

    return path
  }
  catch (error) {
    reportGenerateFailure(nuxt, filename, error)
  }
}

export function createSchemaLoader(nuxt: Nuxt, client: CodegenClient): SchemaLoader {
  let schema: Promise<string | undefined> | undefined

  return () => schema ??= loadSchema(nuxt, client)
}

function getTypescriptPluginConfig({ codegen }: CodegenClient['clientConfig']) {
  return defu({ typescript: codegen ? codegen.plugins?.typescript : undefined }, {
    typescript: {
      useTypeImports: true,
      defaultScalarType: 'unknown',
      useImplementingTypes: true,
      enumsAsTypes: true,
      scalars: {
        DateTime: 'string',
        Decimal: 'string',
        HTML: 'string',
        URL: 'string',
        Color: 'string',
        UnsignedInt64: 'string',
        ISO8601DateTime: 'string',
        JSON: 'string',
      },
    },
  })
}

async function generateTypes(nuxt: Nuxt, client: CodegenClient, filename: string, loadSchema: SchemaLoader) {
  const schema = await loadSchema()

  if (!schema) return ''

  try {
    const config = { schema, plugins: [getTypescriptPluginConfig(client.clientConfig)] }

    await nuxt.callHook(`shopify:${kebabCase(client.clientType)}:generate:types`, { nuxt, config })

    return `${await generateFile(nuxt, filename, config)}\n${EXACT_UTILITY_TYPE}\n`
  }
  catch (error) {
    return reportGenerateFailure(nuxt, filename, error)
  }
}

export function createTypesGenerator(nuxt: Nuxt, client: CodegenClient, filename: string, loadSchema: SchemaLoader) {
  let types: Promise<string> | undefined

  return () => types ??= generateTypes(nuxt, client, filename, loadSchema)
}

async function scanDocuments(documents: string[], cwd: string): Promise<{ failure?: Error, files: Set<string> }> {
  const files = new Set<string>()
  const { include, exclude: ignore } = splitDocuments(documents)

  if (!include.length) return { files }

  const { CodeFileLoader } = await import('@graphql-tools/code-file-loader')

  const loader = new CodeFileLoader({ pluckConfig })

  let failure: Error | undefined

  for (const pointer of include) {
    for (const path of await loader.resolveGlobs(pointer, { cwd, ignore })) {
      const file = resolve(cwd, path)

      if (!GRAPHQL_MARKER.test(await readFile(file, 'utf8').catch(() => ''))) continue

      files.add(file)

      if (failure) continue

      try {
        await loader.handleSinglePath(file, { cwd, noRequire: true, noSilentErrors: true })
      }
      catch (error) {
        failure = new Error(String(error))
      }
    }
  }

  return { failure, files }
}

function createGlobalDeclarations(contents: string, filename: string): string {
  const names = [...contents.matchAll(EXPORTED_TYPE_PATTERN)].map(match => match[1]!)

  if (!names.length) return ''

  const declarations = names
    .map(name => `  type ${name} = import('./${basename(filename)}').${name}`)
    .join('\n')

  return `\ndeclare global {\n${declarations}\n}\n`
}

function getInterfaceExtension(clientType: ShopifyClientType, { queryType, mutationType }: InterfaceExtensionsParams) {
  return `
declare module '@nuxtjs/shopify/${kebabCase(clientType)}' {
  type InputMaybe<T> = ${upperFirst(clientType)}Types.InputMaybe<T>
  interface ${upperFirst(clientType)}Queries extends ${queryType} {}
  interface ${upperFirst(clientType)}Mutations extends ${mutationType} {}
}
`
}

async function generateOperations(nuxt: Nuxt, client: CodegenClient, filename: string, loadSchema: SchemaLoader, documents: DocumentState, revision: number) {
  const schema = await loadSchema()

  if (!schema) return ''

  try {
    const config = {
      schema,
      preset,
      documents: client.clientConfig.documents.slice(),
      presetConfig: {
        importTypes: {
          namespace: `${upperFirst(client.clientType)}Types`,
          from: `./${kebabCase(client.clientType)}.types.d.ts`,
        },
        skipTypenameInOperations: true,
        interfaceExtension: (params: InterfaceExtensionsParams) => getInterfaceExtension(client.clientType, params),
      },
    } satisfies Types.ConfiguredOutput

    await nuxt.callHook(`shopify:${kebabCase(client.clientType)}:generate:operations`, { nuxt, config })

    const { failure, files } = await scanDocuments(config.documents, nuxt.options.rootDir)

    if (documents.revision === revision) documents.graphqlFiles = files

    if (failure) throw failure

    const generated = await generateFile(nuxt, filename, config, { cwd: nuxt.options.rootDir, pluckConfig: pluckConfig as Types.Config['pluckConfig'] })
    const { codegen } = client.clientConfig

    return codegen && codegen.globalTypes ? generated + createGlobalDeclarations(generated, filename) : generated
  }
  catch (error) {
    return reportGenerateFailure(nuxt, filename, error)
  }
}

function watchDocuments(nuxt: Nuxt, client: CodegenClient, filename: string, documents: DocumentState) {
  const matches = createDocumentMatcher(client.clientConfig.documents)

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

    return updateTemplates({ filter: template => template.filename === filename })
  })
}

export function createOperationsGenerator(nuxt: Nuxt, client: CodegenClient, filename: string, loadSchema: SchemaLoader) {
  const documents: DocumentState = { revision: 0, graphqlFiles: new Set() }

  let operations: { revision: number, contents: Promise<string> } | undefined

  watchDocuments(nuxt, client, filename, documents)

  return () => {
    const { revision } = documents

    if (operations?.revision !== revision) {
      operations = { revision, contents: generateOperations(nuxt, client, filename, loadSchema, documents, revision) }
    }

    return operations.contents
  }
}

export type { CodegenClient }
