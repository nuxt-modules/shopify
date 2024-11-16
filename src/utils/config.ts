import type { ModuleOptions, ShopifyConfig } from '../types'

import defu from 'defu'

export enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

export const getCodegenDocuments = (clientType: ShopifyClientType) => {
    const ignores = [
        '!node_modules',
        '!.output',
        '!.nuxt',
    ]

    switch (clientType) {
        case ShopifyClientType.Storefront:
            return [
                '**/*.{gql,graphql,ts,js}',
                '!**/*.admin.{gql,graphql,ts,js}',
                ...ignores,
            ]
        case ShopifyClientType.Admin:
            return [
                '**/*.admin.{gql,graphql,ts,js}',
                ...ignores,
            ]
        default:
            return ignores
    }
}

export const useShopifyConfig = (options: ModuleOptions): ShopifyConfig => {
    const getClientConfig = <T extends ShopifyClientType>(clientType: T) => {
        const clientOptions = options.clients?.[clientType] as ShopifyConfig['clients'][T]
        if (!clientOptions) return

        clientOptions.storeDomain = `https://${options.name}.myshopify.com`
        clientOptions.sandbox = !!(clientOptions.sandbox === undefined || clientOptions.sandbox)
        clientOptions.documents = defu(
            clientOptions.documents,
            getCodegenDocuments(clientType),
        )

        return clientOptions
    }

    const storefront = getClientConfig(ShopifyClientType.Storefront)
    const admin = getClientConfig(ShopifyClientType.Admin)

    return {
        name: options.name,
        debug: options.debug,
        clients: {
            ...(storefront && { storefront }),
            ...(admin && { admin }),

        },
    } satisfies ShopifyConfig
}
