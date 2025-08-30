import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import type { InterfaceExtensionsParams, ShopifyTemplateOptions } from '../types'

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { kebabCase, upperFirst } from 'scule'
import { joinURL } from 'ufo'

import { ShopifyClientType } from './config'
import { useLog } from './log'

async function extractResult(input: Promise<Types.FileOutput[]>) {
    try {
        return (await input)?.at(0)?.content ?? ''
    }
    catch (error) {
        useLog().error((error as Error).message)
        return ''
    }
}

const getInterfaceExtensionFunction = (clientType: ShopifyClientType, queryType: string, mutationType: string) => `
declare module '#shopify/clients/${kebabCase(clientType)}' {
    interface ${upperFirst(clientType)}Queries extends ${queryType} {}
    interface ${upperFirst(clientType)}Mutations extends ${mutationType} {}
}
`

const getIntrospection = (options: ShopifyTemplateOptions) => {
    const { clientType, clientConfig, introspection } = options

    if (introspection && existsSync(introspection)) {
        return introspection
    }

    return joinURL('https://shopify.dev', `${clientType}-graphql-direct-proxy`, clientConfig.apiVersion)
}

const getTypescriptPluginConfig = (options: ShopifyTemplateOptions) => {
    if (options.clientType !== ShopifyClientType.Storefront) return 'typescript'

    return {
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
    }
}

export const generateVirtualModule: NuxtTemplate<Pick<ShopifyTemplateOptions, 'clientType'>>['getContents'] = async (data) => {
    switch (data.options.clientType) {
        case ShopifyClientType.Storefront:
            return `ROLLUP_REPLACE_VIRTUAL_STOREFRONT`
        case ShopifyClientType.Admin:
            return `ROLLUP_REPLACE_VIRTUAL_ADMIN`
    }
}

export const generateIntrospection: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const config = {
        schema: getIntrospection(data.options),
        plugins: [{
            introspection: {
                minify: true,
            },
        }],
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:introspection`, {
        nuxt: data.nuxt,
        config,
    })

    return extractResult(generate({
        overwrite: true,
        ignoreNoDocuments: true,
        silent: useLog().level < LogLevels.debug,
        generates: {
            [data.options.filename]: config,
        },
    }, false))
}

export const generateTypes: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const config = {
        schema: getIntrospection(data.options),
        plugins: [getTypescriptPluginConfig(data.options)],
    } satisfies Types.ConfiguredOutput

    await data.nuxt.callHook(`${kebabCase(data.options.clientType)}:generate:types`, {
        nuxt: data.nuxt,
        config,
    })

    return extractResult(generate({
        overwrite: true,
        ignoreNoDocuments: true,
        silent: useLog().level < LogLevels.debug,
        generates: {
            [data.options.filename]: config,
        },
    }, false))
}

export const generateOperations: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const config = {
        schema: getIntrospection(data.options),
        preset,
        documents: data.options.clientConfig.documents?.map((d) => {
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
        config,
    })

    return extractResult(generate({
        overwrite: true,
        silent: useLog().level < LogLevels.debug,
        generates: {
            [data.options.filename]: config,
        },
        // @ts-expect-error weird behavior
        pluckConfig,
    }, false))
}
