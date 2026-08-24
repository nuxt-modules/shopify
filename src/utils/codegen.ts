import type { Types } from '@graphql-codegen/plugin-helpers'
import type { Nuxt, NuxtTemplate } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync, statSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { kebabCase, upperFirst } from 'scule'
import defu from 'defu'
import { joinURL } from 'ufo'

import { ShopifyClientType } from '../schemas'
import { useLogger } from './log'
import { isInstalled } from './install'
import { getAdminAccessToken } from '../runtime/utils/clients/admin/auth'
import {
  ADMIN_TOKEN_HEADER,
  createStoreDomain,
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
} from '../runtime/utils/clients/transport'

const HYDROGEN_STOREFRONT_SCHEMA = '@shopify/hydrogen/storefront.schema.json'
const HYDROGEN_CUSTOMER_ACCOUNT_SCHEMA = '@shopify/hydrogen/customer-account.schema.json'

const HYDROGEN_SCHEMAS: Partial<Record<ShopifyClientType, string>> = {
  [ShopifyClientType.Storefront]: HYDROGEN_STOREFRONT_SCHEMA,
  [ShopifyClientType.CustomerAccount]: HYDROGEN_CUSTOMER_ACCOUNT_SCHEMA,
}

const INTROSPECTION_ATTEMPTS = 3
const INTROSPECTION_RETRY_DELAY = 5000

const TRANSPORT_ERROR_PATTERN = /Failed to load schema|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|network|fetch failed|timeout/i

const GLOB_MAGIC = /[*?[\]{}()]/

const generateFailures = new Set<string>()

type ShopifyTemplateOptions = {
  filename: string
  shopName: string
  clientType: ShopifyClientType
  clientConfig: ShopifyConfig['clients'][ShopifyClientType]
  introspection?: string
}

type InterfaceExtensionsParams = {
  queryType: string
  mutationType: string
}

function getHydrogenSchema(clientType: ShopifyClientType) {
  const schemaId = HYDROGEN_SCHEMAS[clientType]

  if (!schemaId || !isInstalled(schemaId)) {
    return undefined
  }

  return [import.meta.resolve(schemaId)]
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
  createConfig: (generatorConfig: T) => Types.Config,
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
  createConfig: (generatorConfig: T) => Types.Config,
) {
  const logger = useLogger()

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

    logger.warn(`Failed to introspect the ${kebabCase(options.clientType)} API, falling back to the schema from \`@shopify/hydrogen\`.`)

    try {
      return await extractResult(generate(createConfig({ ...generatorConfig, schema: fallbackSchema }), false))
    }
    catch (fallbackError) {
      return reportGenerateFailure(nuxt, options.filename, fallbackError)
    }
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

async function getIntrospectionCacheKey(options: ShopifyTemplateOptions): Promise<string | undefined> {
  if (!hasStoredIntrospection(options.introspection)) return undefined

  const { mtimeMs, size } = await stat(options.introspection).catch(() => ({ mtimeMs: 0, size: 0 }))

  if (!size) return undefined

  return `${options.introspection}:${mtimeMs}:${size}`
}

async function getIntrospection(options: ShopifyTemplateOptions) {
  const { shopName, clientType, clientConfig, introspection } = options

  if (hasStoredIntrospection(introspection)) {
    return introspection
  }

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
    return [import.meta.resolve(HYDROGEN_CUSTOMER_ACCOUNT_SCHEMA)]
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

export function createIntrospectionGenerator(): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  return async (data) => {
    const generatorConfig = {
      schema: await getIntrospection(data.options),
      plugins: [{
        introspection: {
          minify: true,
        },
      }],
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:introspection`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    return runGenerate(data.nuxt, data.options, generatorConfig, config => ({
      overwrite: true,
      ignoreNoDocuments: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
    }))
  }
}

export function createTypesGenerator(): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  let cached: { key: string, contents: string } | undefined

  return async (data) => {
    const cacheKey = await getIntrospectionCacheKey(data.options)

    if (cacheKey && cached?.key === cacheKey) {
      return cached.contents
    }

    const generatorConfig = {
      schema: await getIntrospection(data.options),
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

export function createOperationsGenerator(): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
  return async (data) => {
    const generatorConfig = {
      schema: await getIntrospection(data.options),
      preset,
      documents: data.options.clientConfig?.documents?.map((d) => {
        if (d.startsWith('!')) {
          return '!' + join(data.nuxt.options.rootDir, d.replace('!', ''))
        }

        return join(data.nuxt.options.rootDir, d)
      }),
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
