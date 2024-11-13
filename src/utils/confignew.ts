import type { Nuxt } from '@nuxt/schema'
import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import type { AdminOptions, ModuleOptions, StorefrontOptions } from '~/src/types'

import { ApiType } from '@shopify/api-codegen-preset'
import { join } from 'node:path'

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

export const useShopifyConfig = (nuxt: Nuxt, options: ModuleOptions): ShopifyConfig => {
    const resolveCodegenOptions = (apiType: ApiType) => {
        const lowerCasedApiType = apiType.toLowerCase() as keyof ShopifyConfig['clients']
    }

    return {
        name: options.name,
        debug: options.debug,
        clients: {},
    }
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
