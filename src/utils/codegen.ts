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

import { ShopifyClientType } from '../schemas/config'
import { useLogger } from './log'

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

async function extractResult(input: Promise<Types.FileOutput[]>) {
    try {
        return (await input)?.at(0)?.content ?? ''
    }
    catch (error) {
        useLogger().error((error as Error).message)
        return ''
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

export function getIntrospection(options: ShopifyTemplateOptions, _config: ShopifyConfig) {
    const { shopName, clientType, clientConfig, introspection } = options

    if (introspection && existsSync(introspection)) {
        return introspection
    }

    const apiVersion = clientConfig?.apiVersion
    const headers: Record<string, string> = { ...(clientConfig?.headers as Record<string, string>) }

    let apiUrl: string

    if (clientType === ShopifyClientType.Admin) {
        const adminConfig = clientConfig as NonNullable<ShopifyConfig['clients']['admin']>
        apiUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/graphql.json`
        headers['X-Shopify-Access-Token'] = adminConfig.accessToken
    }
    else {
        const storefrontConfig = clientConfig as NonNullable<ShopifyConfig['clients']['storefront']>

        if (storefrontConfig.mock) {
            apiUrl = `https://mock.shop/api`
        }
        else {
            apiUrl = `https://${shopName}.myshopify.com/api/${apiVersion}/graphql.json`

            if (storefrontConfig.privateAccessToken) {
                headers['Shopify-Storefront-Private-Token'] = storefrontConfig.privateAccessToken
            }
            else if (storefrontConfig.publicAccessToken) {
                headers['X-Shopify-Storefront-Access-Token'] = storefrontConfig.publicAccessToken
            }
        }
    }

    return [
        {
            [apiUrl]: { headers },
        },
    ]
}

export function getTypescriptPluginConfig(config: ShopifyConfig['clients'][ShopifyClientType]) {
    return defu({ typescript: config?.codegen?.pluginOptions?.typescript }, {
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

export function createIntrospectionGenerator(config: ShopifyConfig): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
    return async (data) => {
        const generatorConfig = {
            schema: getIntrospection(data.options, config),
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

        return extractResult(generate({
            overwrite: true,
            ignoreNoDocuments: true,
            silent: useLogger().level < LogLevels.debug,
            generates: {
                [data.options.filename]: generatorConfig,
            },
        }, false))
    }
}

export function createTypesGenerator(config: ShopifyConfig): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
    return async (data) => {
        const generatorConfig = {
            schema: getIntrospection(data.options, config),
            plugins: [getTypescriptPluginConfig(data.options.clientConfig)],
        } satisfies Types.ConfiguredOutput

        await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:types`, {
            nuxt: data.nuxt,
            config: generatorConfig,
        })

        return extractResult(generate({
            overwrite: true,
            ignoreNoDocuments: true,
            silent: useLogger().level < LogLevels.debug,
            generates: {
                [data.options.filename]: generatorConfig,
            },
        }, false))
    }
}

export function createOperationsGenerator(config: ShopifyConfig): NuxtTemplate<ShopifyTemplateOptions>['getContents'] {
    return async (data) => {
        const generatorConfig = {
            schema: getIntrospection(data.options, config),
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

        return extractResult(generate({
            overwrite: true,
            silent: useLogger().level < LogLevels.debug,
            generates: {
                [data.options.filename]: generatorConfig,
            },
            // @ts-expect-error weird behavior
            pluckConfig,
        }, false))
    }
}

export type { ShopifyTemplateOptions }
