import type { Types } from '@graphql-codegen/plugin-helpers'
import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync, statSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, sep } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { kebabCase, upperFirst } from 'scule'
import defu from 'defu'
import { joinURL } from 'ufo'

import { ShopifyClientType } from '../schemas'
import { useLogger } from './log'
import { getInstalledVersion, resolveInstalledPath } from './install'
import { getAdminAccessToken } from '../runtime/utils/clients/admin/auth'
import {
  ADMIN_TOKEN_HEADER,
  createStoreDomain,
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
} from '../runtime/utils/clients/transport'

const HYDROGEN = '@shopify/hydrogen'

const HYDROGEN_SCHEMAS: Partial<Record<ShopifyClientType, string>> = {
  [ShopifyClientType.Storefront]: `${HYDROGEN}/storefront.schema.json`,
  [ShopifyClientType.CustomerAccount]: `${HYDROGEN}/customer-account.schema.json`,
}

const INTROSPECTION_ATTEMPTS = 3
const INTROSPECTION_RETRY_DELAY = 5000

const TRANSPORT_ERROR_PATTERN = /Failed to load schema|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|network|fetch failed|timeout/i

const GLOB_MAGIC = /[*?[\]{}()]/

const generateFailures = new Set<string>()

type GenerateInput = Types.Config & { cwd?: string }

type ShopifyTemplateOptions = {
  filename: string
  shopName: string
  clientType: ShopifyClientType
  clientConfig: ShopifyConfig['clients'][ShopifyClientType]
}

type IntrospectionGenerator = {
  getContents: (data: { nuxt: Nuxt }) => Promise<string>
  getSchema: (nuxt: Nuxt) => Promise<string | undefined>
}

type InterfaceExtensionsParams = {
  queryType: string
  mutationType: string
}

export const toPosix = (path: string) => path.split(sep).join('/')

function getHydrogenSchema(clientType: ShopifyClientType) {
  const schemaId = HYDROGEN_SCHEMAS[clientType]
  const schemaPath = schemaId && resolveInstalledPath(schemaId)

  return schemaPath ? [schemaPath] : undefined
}

function isHydrogenSchema(schema: Types.ConfiguredOutput['schema'], clientType: ShopifyClientType) {
  const [hydrogenSchema] = getHydrogenSchema(clientType) ?? []

  return !!hydrogenSchema && [schema].flat().includes(hydrogenSchema)
}

async function getHydrogenSchemaApiVersion() {
  const version = await getInstalledVersion(HYDROGEN)
  const [year, month] = version?.split('.').map(Number) ?? []

  if (!year || !month) return undefined

  const apiReleaseMonth = month - ((month - 1) % 3)

  return `${year}-${String(apiReleaseMonth).padStart(2, '0')}`
}

async function warnOnHydrogenSchemaMismatch({ clientType, clientConfig }: ShopifyTemplateOptions) {
  const schemaApiVersion = await getHydrogenSchemaApiVersion()
  const apiVersion = clientConfig?.apiVersion

  if (!schemaApiVersion || !apiVersion || schemaApiVersion === apiVersion) return

  useLogger().warn(
    `The ${kebabCase(clientType)} types are generated from the \`${HYDROGEN}\` schema for API version \`${schemaApiVersion}\`, `
    + `but the client uses \`${apiVersion}\`. Set \`clients.${clientType}.apiVersion\` to \`${schemaApiVersion}\`, `
    + `or install the matching \`${HYDROGEN}\` release`,
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

async function findDocumentParseFailure(documents: string[] | undefined, cwd: string): Promise<Error | undefined> {
  if (!documents?.length) return undefined

  const include: string[] = []
  const ignore: string[] = []

  for (const pointer of documents) {
    if (!pointer.startsWith('!')) {
      include.push(pointer)
      continue
    }

    const pattern = pointer.slice(1)

    ignore.push(GLOB_MAGIC.test(pattern) ? pattern : `${pattern}/**`)
  }

  if (!include.length) return undefined

  const { CodeFileLoader } = await import('@graphql-tools/code-file-loader')

  const loader = new CodeFileLoader({ pluckConfig })

  for (const pointer of include) {
    try {
      await loader.load(pointer, { cwd, ignore, noRequire: true, noSilentErrors: true })
    }
    catch (error) {
      return new Error(String(error))
    }
  }

  return undefined
}

function reportGenerateFailure(nuxt: Nuxt, filename: string, error: unknown): '' {
  const message = `Failed to generate \`${filename}\`: ${(error as Error).message}`

  useLogger().error(`${message}\nTypes for this client are unavailable.`)

  if (!nuxt.options.dev && !nuxt.options._prepare) {
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
) {
  try {
    return await generateWithRetry(generatorConfig, createConfig)
  }
  catch (error) {
    const fallbackSchema = isRemoteSchema(generatorConfig.schema)
      ? getHydrogenSchema(options.clientType)
      : undefined

    if (!fallbackSchema) {
      return reportGenerateFailure(nuxt, options.filename, error)
    }

    useLogger().warn(`Failed to introspect the ${kebabCase(options.clientType)} API, falling back to the schema from \`@shopify/hydrogen\`: ${(error as Error).message}`)

    return runGenerate(nuxt, options, { ...generatorConfig, schema: fallbackSchema }, createConfig)
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

export function getInterfaceExtensionFunction(clientType: ShopifyClientType, queryType: string, mutationType: string) {
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

  const apiVersion = clientConfig?.apiVersion
  const headers: Record<string, string> = { ...(clientConfig?.headers as Record<string, string>) }

  let apiUrl: string

  if (clientType === ShopifyClientType.Storefront) {
    const storefrontConfig = clientConfig as NonNullable<ShopifyConfig['clients']['storefront']>

    if (storefrontConfig.mock) {
      apiUrl = `https://mock.shop/api`
    }
    else {
      apiUrl = joinURL(createStoreDomain(shopName), `api/${apiVersion}/graphql.json`)

      if (storefrontConfig.privateAccessToken) {
        headers[PRIVATE_TOKEN_HEADER] = storefrontConfig.privateAccessToken
      }
      else if (storefrontConfig.publicAccessToken) {
        headers[PUBLIC_TOKEN_HEADER] = storefrontConfig.publicAccessToken
      }
    }
  }
  else if (clientType === ShopifyClientType.CustomerAccount) {
    return getHydrogenSchema(clientType)
  }
  else if (clientType === ShopifyClientType.Admin) {
    const adminConfig = clientConfig as NonNullable<ShopifyConfig['clients']['admin']>

    apiUrl = joinURL(createStoreDomain(shopName), `admin/api/${apiVersion}/graphql.json`)

    headers[ADMIN_TOKEN_HEADER] = await getAdminAccessToken(shopName, adminConfig)
  }
  else {
    throw new Error(`[shopify] Failed to generate introspection: unsupported client type \`${clientType}\``)
  }

  return [
    {
      [apiUrl]: { headers },
    },
  ]
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

async function generateIntrospection(nuxt: Nuxt, options: ShopifyTemplateOptions, path: string) {
  const stored = hasStoredIntrospection(path)

  const generatorConfig = {
    schema: stored ? path : await getIntrospectionSource(options),
    plugins: [{
      introspection: {
        minify: true,
      },
    }],
  } satisfies Types.ConfiguredOutput

  await nuxt.callHook(`${kebabCase(options.clientType)}:generate:introspection`, {
    nuxt,
    config: generatorConfig,
  })

  if (isHydrogenSchema(generatorConfig.schema, options.clientType)) {
    await warnOnHydrogenSchemaMismatch(options)
  }

  const contents = await runIntrospection(nuxt, options, generatorConfig, config => ({
    overwrite: true,
    ignoreNoDocuments: true,
    silent: useLogger().level < LogLevels.verbose,
    generates: {
      [options.filename]: config,
    },
  }))

  if (contents && !stored) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents)
  }

  return contents
}

export function createIntrospectionGenerator(options: ShopifyTemplateOptions, path: string): IntrospectionGenerator {
  let pending: Promise<string> | undefined

  function getContents({ nuxt }: { nuxt: Nuxt }) {
    pending ??= generateIntrospection(nuxt, options, path).finally(() => {
      pending = undefined
    })

    return pending
  }

  async function getSchema(nuxt: Nuxt) {
    if (pending || !hasStoredIntrospection(path)) {
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

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:types`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    const contents = await runGenerate(data.nuxt, data.options, generatorConfig, config => ({
      overwrite: true,
      ignoreNoDocuments: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
    }))

    if (cacheKey && contents) {
      cached = { key: cacheKey, contents }
    }

    return contents
  }
}

export function createOperationsGenerator(introspection: Pick<IntrospectionGenerator, 'getSchema'>): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  return async (data) => {
    const schema = await introspection.getSchema(data.nuxt)

    if (!schema) return ''

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
          return getInterfaceExtensionFunction(
            data.options.clientType,
            params.queryType,
            params.mutationType,
          )
        },
      },
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:operations`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    const parseFailure = await findDocumentParseFailure(generatorConfig.documents, data.nuxt.options.rootDir)

    if (parseFailure) {
      return reportGenerateFailure(data.nuxt, data.options.filename, parseFailure)
    }

    const contents = await runGenerate(data.nuxt, data.options, generatorConfig, config => ({
      cwd: data.nuxt.options.rootDir,
      overwrite: true,
      ignoreNoDocuments: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
      // @ts-expect-error weird behavior
      pluckConfig,
    }))

    if (!contents || !data.options.clientConfig?.codegen || !data.options.clientConfig.codegen.autoImport) {
      return contents
    }

    return contents + createGlobalDeclarations(contents, data.options.filename)
  }
}

export type { ShopifyTemplateOptions }
