import type { CacheOptions, StorageMounts } from 'nitropack'

import {
    getCurrentApiVersion,
    getCurrentSupportedApiVersions,
} from '@shopify/graphql-client'
import { z } from 'zod'

import {
    ShopifyClientType,
    clientSchema,
    storefrontClientSchema,
    adminClientSchema,
    moduleOptionsSchema,
    publicModuleOptionsSchema,
} from './config'

const ignores = [
    '!node_modules',
    '!dist',
    '!.nuxt',
    '!.output',
]

const defaultProxyCacheOptions = {
    short: { maxAge: 1, staleMaxAge: 9, swr: true },
    long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
}

const defaultProxyCacheStorage = { driver: 'lru-cache' }

const clientSchemaWithDefaults = clientSchema.omit({
    apiVersion: true,
    retries: true,
    sandbox: true,
    autoImport: true,
}).extend({
    apiVersion: z.string().refine(v => getCurrentSupportedApiVersions().includes(v), {
        error: v => `Unsupported API version "${v}". Supported versions are: ${getCurrentSupportedApiVersions().join(', ')}`,
    }).optional().default(getCurrentApiVersion().version),

    retries: z.number().optional().default(3),

    sandbox: z.boolean().optional().default(true),
    autoImport: z.boolean().optional().default(true),
})

const storefrontClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    documents: storefrontClientSchema.shape.documents.transform(v => v
        ? v
        : [
                '**/*.{gql,graphql,ts,js}',
                '!**/*.admin.{gql,graphql,ts,js}',
                '!**/admin/**/*.{gql,graphql,ts,js}',
                ...ignores,
            ]),

    publicAccessToken: storefrontClientSchema.shape.publicAccessToken,
    privateAccessToken: storefrontClientSchema.shape.privateAccessToken,
    mock: storefrontClientSchema.shape.mock,
    cache: storefrontClientSchema.shape.cache,

    proxy: z.object({
        path: z.string().optional().default('_proxy/storefront'),
        cache: z.object({
            storage: z.any().transform(v => v as StorageMounts[string]).or(z.string()).optional().default(defaultProxyCacheStorage),
            options: z.record(z.string(), z.any().transform(v => v as Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>)).optional().default(defaultProxyCacheOptions),
        }),
    }).or(z.boolean()).optional().default({
        path: '_proxy/storefront',
        cache: {
            storage: defaultProxyCacheStorage,
            options: defaultProxyCacheOptions,
        },
    }),
})

const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    documents: adminClientSchema.shape.documents.transform(v => v
        ? v
        : [
                '**/*.admin.{gql,graphql,ts,js}',
                '**/admin/**/*.{gql,graphql,ts,js}',
                ...ignores,
            ]),

    autoImport: adminClientSchema.shape.autoImport,

    accessToken: z.string({
        error: 'Access token is required for the admin client',
    }),
})

export const moduleOptionsSchemaWithDefaults = moduleOptionsSchema.omit({
    clients: true,
    errors: true,
    fragments: true,
}).extend({
    clients: z.object({
        [ShopifyClientType.Storefront]: storefrontClientSchemaWithDefaults.transform(client => ({
            ...client,
            ...((client.mock || client.publicAccessToken) ? { documents: ['**/*.vue', ...client.documents] } : {}),
        })).refine(client => client?.mock || client?.privateAccessToken || client?.publicAccessToken, {
            error: 'Either a public or private access token must be provided for the storefront client',
        }).optional(),

        [ShopifyClientType.Admin]: adminClientSchemaWithDefaults.optional(),
    }),

    errors: z.object({
        throw: z.boolean().optional().default(true),
    }).optional().default({
        throw: true,
    }),

    fragments: z.object({
        paths: z.array(z.string()).optional().default(['/graphql']),
        autoImport: z.boolean().optional().default(true),
    }).optional().default({
        paths: ['/graphql'],
        autoImport: true,
    }),
})

export const publicModuleOptionsSchemaWithDefaults = publicModuleOptionsSchema.omit({
    clients: true,
    errors: true,
}).extend({
    clients: z.object({
        [ShopifyClientType.Storefront]: storefrontClientSchemaWithDefaults.omit({
            privateAccessToken: true,
            sandbox: true,
            documents: true,
            codegen: true,
            autoImport: true,
            proxy: true,
        }).and(z.object({
            proxy: z.object({
                path: z.string().optional().default('_proxy/storefront'),
                cache: z.object({
                    options: z.record(z.string(), z.any().transform(v => v as Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>)).optional().default(defaultProxyCacheOptions),
                }).optional(),
            }).or(z.boolean()).optional().default({
                path: '_proxy/storefront',
                cache: {
                    options: defaultProxyCacheOptions,
                },
            }),
        })).optional(),
    }),

    errors: moduleOptionsSchemaWithDefaults.shape.errors,
})
