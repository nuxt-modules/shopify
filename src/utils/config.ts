import type { ModuleOptions, ShopifyConfig, PublicShopifyConfig, ShopifyStorefrontConfig } from '../types'

export enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

const ignores = [
    '!node_modules',
    '!dist',
    '!.nuxt',
    '!.output',
]

export const useShopifyConfig = (options: ModuleOptions) => {
    const usesClientSide = !!(options.clients?.storefront?.publicAccessToken ?? options.clients?.storefront?.mock)

    const getClientConfig = <T extends ShopifyClientType>(clientType: T, documents: string[] = []) => {
        const clientOptions = options.clients?.[clientType] as ShopifyConfig['clients'][T]

        if (!clientOptions) return

        if (clientType === 'storefront' && (clientOptions as ShopifyStorefrontConfig).mock) {
            (clientOptions as ShopifyStorefrontConfig).publicAccessToken = 'mock-public-access-token'
        }

        clientOptions.sandbox = !!(clientOptions.sandbox === undefined || clientOptions.sandbox)

        clientOptions.documents = [
            ...clientOptions.documents ?? [],
            ...documents,
        ]

        return clientOptions
    }

    const buildConfig = () => {
        const storefront = getClientConfig(ShopifyClientType.Storefront, [
            '**/*.{gql,graphql,ts,js}',
            '!**/*.admin.{gql,graphql,ts,js}',
            '!**/admin/**/*.{gql,graphql,ts,js}',
            ...(usesClientSide ? ['**/*.vue'] : []),
            ...ignores,
        ])

        const admin = getClientConfig(ShopifyClientType.Admin, [
            '**/*.admin.{gql,graphql,ts,js}',
            '**/admin/**/*.{gql,graphql,ts,js}',
            ...ignores,
        ])

        return {
            name: options.name,
            logger: options.logger,
            autoImports: options.autoImports,
            errors: options.errors,
            clients: {
                ...(storefront && { storefront }),
                ...(admin && { admin }),
            },
        } satisfies ShopifyConfig
    }

    const buildPublicConfig = (config: ShopifyConfig) => {
        if (!config.clients?.storefront || !usesClientSide) return undefined

        const {
            privateAccessToken: _privateAccessToken,
            skipCodegen: _skipCodegen,
            sandbox: _sandbox,
            documents: _documents,
            ...storefront
        } = config.clients.storefront

        return {
            name: config.name,
            logger: config.logger,
            errors: config.errors,
            clients: {
                storefront,
            },
        } satisfies PublicShopifyConfig
    }

    const config = buildConfig()
    const publicConfig = buildPublicConfig(config)

    return {
        config,
        publicConfig,
    }
}
