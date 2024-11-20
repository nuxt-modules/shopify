import type { ModuleOptions, ShopifyConfig } from '../types'

import { z } from 'zod'

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
        logger: options.logger,
        clients: {
            ...(storefront && { storefront }),
            ...(admin && { admin }),

        },
    } satisfies ShopifyConfig
}

export const useShopifyConfigSchema = (options: ModuleOptions) => {
    const clientSchema = z.object({
        apiVersion: z.string().min(1),
        sandbox: z.boolean().optional(),
        documents: z.array(z.string()).optional(),
    })

    const schema = z.object({
        name: z.string().min(1),
        clients: z.object({
            storefront: clientSchema.extend({
                publicAccessToken: z.string().min(1).optional(),
                privateAccessToken: z.string().min(1).optional(),
            }).optional(),
            admin: clientSchema.extend({
                accessToken: z.string().min(1),
            }).optional(),
        }),
    })

    return schema.safeParse(options)
}
