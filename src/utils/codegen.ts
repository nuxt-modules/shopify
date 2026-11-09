import type { Types } from '@graphql-codegen/plugin-helpers'
import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync, statSync } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { resolveModuleURL } from 'exsolve'
import { kebabCase, upperFirst } from 'scule'
import defu from 'defu'

import { ShopifyClientType } from '../schemas'
import { splitDocuments } from './clients'
import { GRAPHQL_MARKER } from './graphql/literals'
import { useLogger } from './log'
import { resolveInstalledPath } from './install'
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

const loadPlugin = (rootDir: string) => (name: string) => import(resolveModuleURL(name, { from: [import.meta.url, rootDir], cache: false }))

const EXACT_UTILITY_TYPE = 'export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };'

const generateFailures = new Set<string>()

type GenerateInput = Types.Config & { cwd?: string }

type ShopifyTemplateOptions = {
  filename: string
  shopName: string
  clientType: ShopifyClientType
  clientConfig: ShopifyConfig['clients'][ShopifyClientType]
}

type DocumentState = {
  revision: number
  graphqlFiles: Set<string>
}

type IntrospectionGenerator = {
  getContents: (data: { nuxt: Nuxt }) => Promise<string>
  getSchema: (nuxt: Nuxt) => Promise<string | undefined>
}

type InterfaceExtensionsParams = {
  queryType: string
  mutationType: string
}

function getHydrogenSchema(clientType: ShopifyClientType) {
  const schemaId = HYDROGEN_SCHEMAS[clientType]
  const schemaPath = schemaId && resolveInstalledPath(schemaId)

  return schemaPath ? [schemaPath] : undefined
}

function isHydrogenSchema(schema: Types.ConfiguredOutput['schema'], clientType: ShopifyClientType) {
  const [hydrogenSchema] = getHydrogenSchema(clientType) ?? []

  return !!hydrogenSchema && [schema].flat().includes(hydrogenSchema)
}

function warnOnHydrogenSchemaMismatch({ clientType, clientConfig }: ShopifyTemplateOptions) {
  const apiVersion = clientConfig?.apiVersion

  if (!apiVersion || apiVersion === DEFAULT_API_VERSION) return

  useLogger().warn(
    `The ${kebabCase(clientType)} types are generated from the \`${HYDROGEN}\` schema for API version \`${DEFAULT_API_VERSION}\`, `
    + `but the client uses \`${apiVersion}\`. Set \`clients.${clientType}.apiVersion\` to \`${DEFAULT_API_VERSION}\` to match them`,
  )
}

function isRemoteSchema(schema: Types.ConfiguredOutput['schema']) {
  return Array.isArray(schema) && schema.length > 0 && schema.every(pointer => typeof pointer === 'object')
}

async function extractResult(input: Promise<Types.FileOutput[]>) {
  return (await input)?.at(0)?.content ?? ''
}

function hasStoredIntrospection(path?: string): path is string {
  if (!path || !existsSync(path)) return false

  return statSync(path).size > 0
}

const fallbackMarker = (path: string) => `${path}.fallback`

function hasCurrentIntrospection(path: string, retryFallback: boolean): boolean {
  return hasStoredIntrospection(path) && !(retryFallback && existsSync(fallbackMarker(path)))
}

function collectErrorMessages(error: unknown): string {
  const messages = [(error as Error)?.message ?? String(error)]

  for (const nested of (error as AggregateError)?.errors ?? []) {
    messages.push((nested as Error)?.message ?? String(nested))
  }

  return messages.join('\n')
}

function isTransportError(error: unknown): boolean {
  return TRANSPORT_ERROR_PATTERN.test(collectErrorMessages(error))
}

async function generateWithRetry<T extends Types.ConfiguredOutput>(
  generatorConfig: T,
  createConfig: (generatorConfig: T) => GenerateInput,
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await extractResult(generate(createConfig(generatorConfig), false))
    }
    catch (error) {
      if (!isRemoteSchema(generatorConfig.schema) || !isTransportError(error) || attempt >= INTROSPECTION_ATTEMPTS) {
        throw error
      }

      useLogger().warn(`Introspection attempt ${attempt} failed, retrying: ${(error as Error).message}`)

      await new Promise(resolve => setTimeout(resolve, INTROSPECTION_RETRY_DELAY * attempt))
    }
  }
}

export function getGenerateFailures(): string[] {
  return [...generateFailures]
}

export function clearGenerateFailures() {
  generateFailures.clear()
}

async function scanDocuments(documents: string[] | undefined, cwd: string): Promise<{ failure?: Error, files: Set<string> }> {
  const files = new Set<string>()
  const { include, exclude: ignore } = splitDocuments(documents ?? [])

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
        await loader.load(path, { cwd, noRequire: true, noSilentErrors: true })
      }
      catch (error) {
        failure = new Error(String(error))
      }
    }
  }

  return { failure, files }
}

function reportGenerateFailure(nuxt: Nuxt, filename: string, error: unknown): '' {
  const message = `Failed to generate \`${filename}\`: ${(error as Error).message}`

  useLogger().error(`${message}\nTypes for this client are unavailable`)

  if (!nuxt.options.dev && !nuxt.options._prepare && !nuxt.options.test) {
    generateFailures.add(message)
  }

  return ''
}

async function runGenerate<T extends Types.ConfiguredOutput>(
  nuxt: Nuxt,
  options: ShopifyTemplateOptions,
  generatorConfig: T,
  createConfig: (generatorConfig: T) => GenerateInput,
) {
  try {
    return await extractResult(generate(createConfig(generatorConfig), false))
  }
  catch (error) {
    return reportGenerateFailure(nuxt, options.filename, error)
  }
}

async function runIntrospection<T extends Types.ConfiguredOutput>(
  nuxt: Nuxt,
  options: ShopifyTemplateOptions,
  generatorConfig: T,
  createConfig: (generatorConfig: T) => GenerateInput,
): Promise<{ contents: string, fallback: boolean }> {
  try {
    return { contents: await generateWithRetry(generatorConfig, createConfig), fallback: false }
  }
  catch (error) {
    const fallbackSchema = isRemoteSchema(generatorConfig.schema)
      ? getHydrogenSchema(options.clientType)
      : undefined

    if (!fallbackSchema) {
      return { contents: reportGenerateFailure(nuxt, options.filename, error), fallback: false }
    }

    useLogger().warn(`Failed to introspect the ${kebabCase(options.clientType)} API, falling back to the schema from \`@shopify/hydrogen\`: ${(error as Error).message}`)

    warnOnHydrogenSchemaMismatch(options)

    return { contents: await runGenerate(nuxt, options, { ...generatorConfig, schema: fallbackSchema }, createConfig), fallback: true }
  }
}

const EXPORTED_TYPE_PATTERN = /^export type (\w+) =/gm

function createGlobalDeclarations(contents: string, filename: string): string {
  const names = [...contents.matchAll(EXPORTED_TYPE_PATTERN)].map(match => match[1]!)

  if (!names.length) return ''

  const specifier = `./${basename(filename)}`

  const declarations = names
    .map(name => `  type ${name} = import('${specifier}').${name}`)
    .join('\n')

  return `\ndeclare global {\n${declarations}\n}\n`
}

function getInterfaceExtension(clientType: ShopifyClientType, queryType: string, mutationType: string) {
  return `
declare module '@nuxtjs/shopify/${kebabCase(clientType)}' {
  type InputMaybe<T> = ${upperFirst(clientType)}Types.InputMaybe<T>
  interface ${upperFirst(clientType)}Queries extends ${queryType} {}
  interface ${upperFirst(clientType)}Mutations extends ${mutationType} {}
}
`
}

async function getIntrospectionCacheKey(path: string): Promise<string | undefined> {
  const { mtimeMs, size } = await stat(path).catch(() => ({ mtimeMs: 0, size: 0 }))

  if (!size) return undefined

  return `${path}:${mtimeMs}:${size}`
}

async function getIntrospectionSource(options: ShopifyTemplateOptions) {
  const { shopName, clientType, clientConfig } = options

  if (clientType === ShopifyClientType.CustomerAccount || (clientType === ShopifyClientType.Storefront && clientConfig?.apiVersion === DEFAULT_API_VERSION)) {
    return getHydrogenSchema(clientType)
  }

  if (clientType === ShopifyClientType.Storefront) {
    const { apiUrl, headers } = createStorefrontConfig({ name: shopName, clients: { storefront: clientConfig as NonNullable<ShopifyConfig['clients']['storefront']> } })

    return [{ [apiUrl]: { headers: headers as Record<string, string>, timeout: REQUEST_TIMEOUT_MS } }]
  }

  const adminConfig = clientConfig as NonNullable<ShopifyConfig['clients']['admin']>
  const { apiUrl, headers } = createAdminConfig({ name: shopName, clients: { admin: adminConfig } })

  return [{ [apiUrl]: { headers: { ...headers as Record<string, string>, [ADMIN_TOKEN_HEADER]: await getAdminAccessToken(shopName, adminConfig) }, timeout: REQUEST_TIMEOUT_MS } }]
}

function getTypescriptPluginConfig(config: ShopifyConfig['clients'][ShopifyClientType]) {
  return defu({ typescript: config?.codegen ? config.codegen.plugins?.typescript : undefined }, {
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

async function generateIntrospection(nuxt: Nuxt, options: ShopifyTemplateOptions, path: string, retryFallback: boolean) {
  if (hasCurrentIntrospection(path, retryFallback)) return await readFile(path, 'utf8')

  let schema: Types.ConfiguredOutput['schema']

  try {
    schema = await getIntrospectionSource(options)
  }
  catch (error) {
    return reportGenerateFailure(nuxt, options.filename, error)
  }

  const generatorConfig = {
    schema,
    plugins: [{
      introspection: {
        minify: true,
      },
    }],
  } satisfies Types.ConfiguredOutput

  await nuxt.callHook(`shopify:${kebabCase(options.clientType)}:generate:introspection`, {
    nuxt,
    config: generatorConfig,
  })

  if (isHydrogenSchema(generatorConfig.schema, options.clientType)) {
    warnOnHydrogenSchemaMismatch(options)
  }

  const { contents, fallback } = await runIntrospection(nuxt, options, generatorConfig, config => ({
    overwrite: true,
    pluginLoader: loadPlugin(nuxt.options.rootDir),
    ignoreNoDocuments: true,
    silent: useLogger().level < LogLevels.verbose,
    generates: {
      [options.filename]: config,
    },
  }))

  if (contents) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents)

    if (fallback) await writeFile(fallbackMarker(path), '')
    else await rm(fallbackMarker(path), { force: true })
  }

  return contents
}

export function createIntrospectionGenerator(options: ShopifyTemplateOptions, path: string): IntrospectionGenerator {
  let pending: Promise<string> | undefined
  let retryFallback = true

  function getContents({ nuxt }: { nuxt: Nuxt }) {
    pending ??= generateIntrospection(nuxt, options, path, retryFallback).finally(() => {
      pending = undefined
      retryFallback = false
    })

    return pending
  }

  async function getSchema(nuxt: Nuxt) {
    if (pending || !hasCurrentIntrospection(path, retryFallback)) {
      await getContents({ nuxt })
    }

    return hasStoredIntrospection(path) ? path : undefined
  }

  return { getContents, getSchema }
}

export function createTypesGenerator(introspection: Pick<IntrospectionGenerator, 'getSchema'>): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  let cached: { key: string, contents: string } | undefined

  return async (data) => {
    const schema = await introspection.getSchema(data.nuxt)

    if (!schema) return ''

    const cacheKey = await getIntrospectionCacheKey(schema)

    if (cacheKey && cached?.key === cacheKey) {
      return cached.contents
    }

    const generatorConfig = {
      schema,
      plugins: [getTypescriptPluginConfig(data.options.clientConfig)],
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`shopify:${kebabCase(data.options.clientType)}:generate:types`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    const generated = await runGenerate(data.nuxt, data.options, generatorConfig, config => ({
      overwrite: true,
      pluginLoader: loadPlugin(data.nuxt.options.rootDir),
      ignoreNoDocuments: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
    }))

    const contents = generated && `${generated}\n${EXACT_UTILITY_TYPE}\n`

    if (cacheKey && contents) {
      cached = { key: cacheKey, contents }
    }

    return contents
  }
}

export function createOperationsGenerator(
  introspection: Pick<IntrospectionGenerator, 'getSchema'>,
  documents: DocumentState = { revision: 0, graphqlFiles: new Set() },
): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  let cached: { key: string, contents: string } | undefined

  return async (data) => {
    const schema = await introspection.getSchema(data.nuxt)

    if (!schema) return ''

    const schemaKey = await getIntrospectionCacheKey(schema)
    const revision = documents.revision
    const cacheKey = schemaKey && `${schemaKey}:${revision}`

    if (cacheKey && cached?.key === cacheKey) {
      return cached.contents
    }

    const generatorConfig = {
      schema,
      preset,
      documents: data.options.clientConfig?.documents?.slice(),
      presetConfig: {
        importTypes: {
          namespace: `${upperFirst(data.options.clientType)}Types`,
          from: `./${kebabCase(data.options.clientType)}.types.d.ts`,
        },
        skipTypenameInOperations: true,
        interfaceExtension: (params: InterfaceExtensionsParams) => {
          return getInterfaceExtension(
            data.options.clientType,
            params.queryType,
            params.mutationType,
          )
        },
      },
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`shopify:${kebabCase(data.options.clientType)}:generate:operations`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    const { failure, files } = await scanDocuments(generatorConfig.documents, data.nuxt.options.rootDir)

    if (documents.revision === revision) documents.graphqlFiles = files

    const generated = failure
      ? reportGenerateFailure(data.nuxt, data.options.filename, failure)
      : await runGenerate(data.nuxt, data.options, generatorConfig, config => ({
          cwd: data.nuxt.options.rootDir,
          overwrite: true,
          pluginLoader: loadPlugin(data.nuxt.options.rootDir),
          ignoreNoDocuments: true,
          silent: useLogger().level < LogLevels.verbose,
          generates: {
            [data.options.filename]: config,
          },
          pluckConfig: pluckConfig as GenerateInput['pluckConfig'],
        }))

    const contents = generated && data.options.clientConfig?.codegen && data.options.clientConfig.codegen.globalTypes
      ? generated + createGlobalDeclarations(generated, data.options.filename)
      : generated

    if (cacheKey && documents.revision === revision) {
      cached = { key: cacheKey, contents }
    }

    return contents
  }
}

export type { DocumentState, ShopifyTemplateOptions }
