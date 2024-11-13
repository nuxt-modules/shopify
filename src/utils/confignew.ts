import type { Nuxt } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { AdminOptions, ModuleOptions, StorefrontOptions } from '~/src/types'

import { ApiType } from '@shopify/api-codegen-preset'
import { join } from 'node:path'
import { upperFirst } from 'scule'

type ShopifyConfig = {
    name: string
    debug?: boolean
    clients: {
        storefront?: StorefrontOptions & {
            codegen?: ShopifyApiTypesOptions // default: true
        }
        admin?: AdminOptions & {
            codegen?: ShopifyApiTypesOptions // default: true
        }
    }
}

type ClientType = keyof ModuleOptions['clients']

export const useShopifyConfig = (nuxt: Nuxt, options: ModuleOptions): ShopifyConfig => {
    const getCodegenOptions = (key: ClientType): ShopifyApiTypesOptions | undefined => {
        const clientOptions = options.clients?.[key]
        if (!clientOptions || clientOptions.codegen === false) return

        const codegenOptions = clientOptions.codegen ?? true
        if (!codegenOptions) return

        const storefrontDocuments = [
            '**/!(*.{admin,customer}).{gql,graphql}',
            '**/*.{ts,js}',
        ]

        return {
            apiType: upperFirst(key) as ApiType,
            apiVersion: clientOptions.apiVersion,
            documents: [
                '!node_modules',
                '!.nuxt',
                '!dist',
                `**/*.${key}.{gql,graphql}`,
                ...(key === 'storefront' ? storefrontDocuments : []),
            ],
            outputDir: join('.nuxt/types/shopify', key),
        } as ShopifyApiTypesOptions
    }

    return {
        name: options.name,
        debug: options.debug,
        clients: {
            storefront: options.clients.storefront,
            admin: options.clients.storefront,
        },
    } satisfies ShopifyConfig
}

export function getDefaultOptions(apiType: ApiType) {
    const documents = [
        '!node_modules',
        '!.nuxt',
        '!dist',
        `**/*.${apiType.toLowerCase()}.{gql,graphql}`,
    ]

    // @TODO: improve customizability
    if (apiType === ApiType.Storefront) {
        documents.push(...[
            '**/!(*.{admin,customer}).{gql,graphql}',
            '**/*.{ts,js}',
        ])
    }

    return {
        documents,
        outputDir: join('.nuxt/types/shopify', apiType.toLowerCase()),
    }
}
