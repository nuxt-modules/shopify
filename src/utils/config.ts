import type { ModuleOptions, ShopifyConfig, PublicShopifyConfig, ShopifyStorefrontConfig } from '../types'

export enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

const ignores = [
    '!node_modules',
    '!.output',
    '!.nuxt',
]

export const useShopifyConfig = (options: ModuleOptions) => {
    const getClientConfig = <T extends ShopifyClientType>(clientType: T, documents: string[] = []) => {
        const clientOptions = options.clients?.[clientType] as ShopifyConfig['clients'][T]

        if (!clientOptions) return

        if (clientType === 'storefront' && (clientOptions as ShopifyStorefrontConfig).mock) {
            (clientOptions as ShopifyStorefrontConfig).publicAccessToken = 'mock-public-access-token'
            clientOptions.storeDomain = 'https://mock.shop'
        }
        else {
            clientOptions.storeDomain = `https://${options.name}.myshopify.com`
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
            ...(options.clients?.storefront?.publicAccessToken ? ['**/*.vue'] : []),
            ...ignores,
        ])

        const admin = getClientConfig(ShopifyClientType.Admin, [
            '**/*.admin.{gql,graphql,ts,js}',
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
        if (!config.clients?.storefront || (!config.clients.storefront.publicAccessToken && !config.clients.storefront.mock)) return undefined

        const {
            privateAccessToken: _privateAccessToken,
            skipCodegen: _skipCodegen,
            sandbox: _sandbox,
            documents: _documents,
            mock: _mock,
            ...storefront
        } = config.clients.storefront

        return {
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
