import type { ShopifyClientType } from './config'
import type { InterfaceExtensionsParams, ShopifyTypeTemplateOptions } from '../types'
import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import { generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'
import { preset } from '@shopify/graphql-codegen'
import { upperFirst } from 'scule'

async function extractResult(input: Promise<Types.FileOutput[]>) {
    try {
        return (await input)?.at(0)?.content ?? ''
    }
    catch (error) {
        useLogger('nuxt-shopify').error((error as Error).message)
        return ''
    }
}

const getInterfaceExtensionFunction = (clientType: ShopifyClientType, queryType: string, mutationType: string) => `
declare module '@shopify/${clientType}-api-client' {
    type InputMaybe<T> = ${upperFirst(clientType)}Types.InputMaybe<T>
    interface ${upperFirst(clientType)}Queries extends ${queryType} {}
    interface ${upperFirst(clientType)}Mutations extends ${mutationType} {}
}
`

export const generateIntrospection: NuxtTemplate<ShopifyTypeTemplateOptions>['getContents'] = async (data) => {
    return extractResult(generate({
        ignoreNoDocuments: true,
        silent: true,
        generates: {
            [`_${data.options.clientType}.schema.json`]: {
                schema: `https://shopify.dev/${data.options.clientType}-graphql-direct-proxy/${data.options.clientConfig.apiVersion}/`,
                plugins: ['introspection'],
            },
        },
    }, false))
}

export const generateTypes: NuxtTemplate<ShopifyTypeTemplateOptions>['getContents'] = async (data) => {
    return extractResult(generate({
        ignoreNoDocuments: true,
        silent: true,
        generates: {
            [`_${data.options.clientType}.types.d.ts`]: {
                schema: `https://shopify.dev/${data.options.clientType}-graphql-direct-proxy/${data.options.clientConfig.apiVersion}/`,
                plugins: ['typescript'],
            },
        },
    }, false))
}

export const generateOperations: NuxtTemplate<ShopifyTypeTemplateOptions>['getContents'] = async (data) => {
    return extractResult(generate({
        silent: true,
        generates: {
            [`_${data.options.clientType}.operations.d.ts`]: {
                schema: `https://shopify.dev/${data.options.clientType}-graphql-direct-proxy/${data.options.clientConfig.apiVersion}/`,
                preset,
                documents: data.options.clientConfig.documents,
                presetConfig: {
                    importTypes: {
                        namespace: `${upperFirst(data.options.clientType)}Types`,
                        from: `./${data.options.clientType}.types.d.ts`,
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
            },
        },
    }, false))
}
