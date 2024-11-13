import type { ModuleOptions, ShopifyClientType, ShopifyConfig } from '~/src/types'

import { type ApiType, shopifyApiTypes } from '@shopify/api-codegen-preset'
import defu from 'defu'
import { join } from 'node:path'
import { upperFirst } from 'scule'

export const useShopifyConfig = (options: ModuleOptions): ShopifyConfig => {
    const getCodegenConfig = (key: ShopifyClientType, customDocuments: string[] = []) => {
        const clientOptions = options.clients?.[key]
        if (!clientOptions || clientOptions.codegen === false) return

        let result = {
            apiType: upperFirst(key) as ApiType,
            apiVersion: clientOptions.apiVersion,
            documents: [
                '!node_modules',
                '!.nuxt',
                '!dist',
                ...customDocuments,
                `**/*.${key}.{gql,graphql,ts,js}`,
            ],
            outputDir: join('.nuxt/types/shopify', key),
        }

        // If there are custom options, merge them with the defaults
        if (clientOptions.codegen !== undefined && clientOptions.codegen !== true) {
            result = defu(result, clientOptions.codegen)
        }

        return shopifyApiTypes(result)
    }

    const getClientConfig = <T extends ShopifyClientType>(key: T, customDocuments: string[] = []) => {
        const clientOptions = options.clients?.[key]
        if (!clientOptions) return

        return defu(
            clientOptions,
            {
                storeDomain: `https://${options.name}.myshopify.com/api/${clientOptions.apiVersion}/graphql.json`,
                codegen: getCodegenConfig(key, customDocuments),
            },
        ) as ShopifyConfig['clients'][T]
    }

    return {
        name: options.name,
        debug: options.debug,
        clients: {
            storefront: getClientConfig('storefront', [
                '**/!(*.admin).{gql,graphql,ts,js}',
            ]),
            admin: getClientConfig('admin'),
        },
    } satisfies ShopifyConfig
}
