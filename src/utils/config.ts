import type { ModuleOptions, ShopifyConfig } from '../types'

import defu from 'defu'

export enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

const ignores = [
    '!node_modules',
    '!.output',
    '!.nuxt',
]

export const useShopifyConfig = (options: ModuleOptions): ShopifyConfig => {
    const getClientConfig = <T extends ShopifyClientType>(clientType: T, documents: string[] = []) => {
        const clientOptions = options.clients?.[clientType] as ShopifyConfig['clients'][T]
        if (!clientOptions) return

        clientOptions.storeDomain = `https://${options.name}.myshopify.com`
        clientOptions.sandbox = !!(clientOptions.sandbox === undefined || clientOptions.sandbox)

        clientOptions.documents = [
            ...clientOptions.documents ?? [],
            ...documents,
        ]

        return clientOptions
    }

    const storefront = getClientConfig(ShopifyClientType.Storefront, [
        '**/*.{gql,graphql,ts,js}',
        '!**/*.admin.{gql,graphql,ts,js}',
        ...ignores,
    ])

    const admin = getClientConfig(ShopifyClientType.Admin, [
        '**/*.admin.{gql,graphql,ts,js}',
        ...ignores,
    ])

    return {
        name: options.name,
        debug: options.debug,
        clients: {
            ...(storefront && { storefront }),
            ...(admin && { admin }),

        },
    } satisfies ShopifyConfig
}
