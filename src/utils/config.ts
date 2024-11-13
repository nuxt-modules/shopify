import type { ShopifyApiTypesOptions, ApiType } from '@shopify/api-codegen-preset'
import type { AdminOptions, ModuleOptions, StorefrontOptions } from '~/src/types'

import defu from 'defu'
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

const documentIgnores = [
    '!node_modules',
    '!.nuxt',
    '!dist',
]

export const useShopifyConfig = (options: ModuleOptions): ShopifyConfig => {
    const getCodegenOptions = (key: ClientType, customDocuments: string[] = []): ShopifyApiTypesOptions | undefined => {
        const clientOptions = options.clients?.[key]
        if (!clientOptions || clientOptions.codegen === false) return

        let result = {
            apiType: upperFirst(key) as ApiType,
            apiVersion: clientOptions.apiVersion,
            documents: [
                ...documentIgnores,
                ...customDocuments,
                `**/*.${key}.{gql,graphql}`,
            ],
            outputDir: join('.nuxt/types/shopify', key),
        }

        // If there are custom options, merge them with the defaults
        if (clientOptions.codegen !== undefined && clientOptions.codegen !== true) {
            result = defu(result, clientOptions.codegen)
        }

        return result
    }

    const getClientConfig = <T extends ClientType>(key: T, customDocuments: string[] = []): ShopifyConfig['clients'][T] => {
        const clientOptions = options.clients?.[key]
        if (!clientOptions) return

        return defu(
            clientOptions,
            {
                storeDomain: `https://${options.name}.myshopify.com/api/${clientOptions.apiVersion}/graphql.json`,
                codegen: getCodegenOptions(key, customDocuments),
            },
        )
    }

    return {
        name: options.name,
        debug: options.debug,
        clients: {
            storefront: getClientConfig('storefront'),
            admin: getClientConfig('admin'),
        },
    } satisfies ShopifyConfig
}
