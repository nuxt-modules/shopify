import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import type {
    GenericApiClientConfig,
    InterfaceExtensionsParams,
    ShopifyAdminConfig,
    ShopifyStorefrontConfig,
    ShopifyTemplateOptions,
} from '../types'

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { generate } from '@graphql-codegen/cli'
import { preset, pluckConfig } from '@shopify/graphql-codegen'
import { LogLevels } from 'consola'
import { kebabCase, upperFirst } from 'scule'

import { ShopifyClientType } from './config'
import { useLog } from './log'
import { createAdminConfig } from '../runtime/utils/admin'
import { createStorefrontConfig } from '../runtime/utils/storefront'

async function extractResult(input: Promise<Types.FileOutput[]>) {
    try {
        return (await input)?.at(0)?.content ?? ''
    }
    catch (error) {
        useLog().error((error as Error).message)
        return ''
    }
}

export const getInterfaceExtensionFunction = (clientType: ShopifyClientType, queryType: string, mutationType: string) => `
declare module '@nuxtjs/shopify/${kebabCase(clientType)}' {
    type InputMaybe<T> = ${upperFirst(clientType)}Types.InputMaybe<T>
    interface ${upperFirst(clientType)}Queries extends ${queryType} {}
    interface ${upperFirst(clientType)}Mutations extends ${mutationType} {}
}
`

const getIntrospection = (options: ShopifyTemplateOptions) => {
    const { shopName, clientType, clientConfig, introspection } = options

    if (introspection && existsSync(introspection)) {
        return introspection
    }

    let config: GenericApiClientConfig

    switch (clientType) {
        case ShopifyClientType.Admin:
            config = createAdminConfig({ name: shopName, clients: { admin: clientConfig as ShopifyAdminConfig } })
            break
        case ShopifyClientType.Storefront:
            config = createStorefrontConfig({ name: shopName, clients: { storefront: clientConfig as ShopifyStorefrontConfig } })
            break
    }

    return [
        {
            [config.apiUrl]: {
                headers: config.headers as Record<string, string>,
            },
        },
    ]
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
