import type { ShopifyClientType } from './config'
import type { InterfaceExtensionsParams, ShopifyTemplateOptions } from '../types'
import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'

import { generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'
import { preset } from '@shopify/graphql-codegen'
import { existsSync } from 'node:fs'
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

const getIntrospection = (options: ShopifyTemplateOptions) => {
    const { clientType, clientConfig, introspection } = options
    if (introspection && existsSync(introspection)) {
        return introspection
    }

    return `https://shopify.dev/${clientType}-graphql-direct-proxy/${clientConfig.apiVersion}/`
}

export const generateIntrospection: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const generates = {
        [data.options.filename]: {
            schema: getIntrospection(data.options),
            plugins: ['introspection'],
        },
    }

    return extractResult(generate({
        ignoreNoDocuments: true,
        silent: true,
        generates,
    }, false))
}

export const generateTypes: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const generates = {
        [data.options.filename]: {
            schema: getIntrospection(data.options),
            plugins: ['typescript'],
        },
    }

    return extractResult(generate({
        ignoreNoDocuments: true,
        silent: true,
        generates,
    }, false))
}

export const generateOperations: NuxtTemplate<ShopifyTemplateOptions>['getContents'] = async (data) => {
    const generates = {
        [data.options.filename]: {
            schema: getIntrospection(data.options),
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
    }

    return extractResult(generate({
        silent: true,
        generates,
    }, false))
}
