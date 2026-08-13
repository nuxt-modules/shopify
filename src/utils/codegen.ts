import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { existsSync } from 'node:fs'
import { join } from 'node:path'
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

async function runGenerate<T extends Types.ConfiguredOutput>(
  options: ShopifyTemplateOptions,
  generatorConfig: T,
  createConfig: (generatorConfig: T) => Types.Config,
) {
  const logger = useLogger()

  try {
    return await extractResult(generate(createConfig(generatorConfig), false))
  }
  catch (error) {
    const fallbackSchema = isRemoteSchema(generatorConfig.schema)
      ? getHydrogenSchema(options.clientType)
      : undefined

    if (!fallbackSchema) {
      logger.error(`Failed to generate \`${options.filename}\`: ${(error as Error).message}`)
      return ''
    }

    logger.warn(`Failed to introspect the ${kebabCase(options.clientType)} API, falling back to the schema shipped with \`@shopify/hydrogen\`.`)

    try {
      return await extractResult(generate(createConfig({ ...generatorConfig, schema: fallbackSchema }), false))
    }
    catch (fallbackError) {
      logger.error(`Failed to generate \`${options.filename}\`: ${(fallbackError as Error).message}`)
      return ''
    }
  }
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

async function getIntrospection(options: ShopifyTemplateOptions) {
  const { shopName, clientType, clientConfig, introspection } = options

  if (introspection && existsSync(introspection)) {
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

    return runGenerate(data.options, generatorConfig, config => ({
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
  return async (data) => {
    const generatorConfig = {
      schema: await getIntrospection(data.options),
      plugins: [getTypescriptPluginConfig(data.options.clientConfig)],
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:types`, {
      nuxt: data.nuxt,
      config: generatorConfig,
    })

    return runGenerate(data.options, generatorConfig, config => ({
      overwrite: true,
      ignoreNoDocuments: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
    }))
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

    return runGenerate(data.options, generatorConfig, config => ({
      overwrite: true,
      silent: useLogger().level < LogLevels.verbose,
      generates: {
        [data.options.filename]: config,
      },
      // @ts-expect-error weird behavior
      pluckConfig,
    }))
  }
}

export type { ShopifyTemplateOptions }
