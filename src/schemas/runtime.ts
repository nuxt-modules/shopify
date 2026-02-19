import type { CacheOptions, StorageMounts } from 'nitropack'
import type { LRUDriverOptions } from 'unstorage/drivers/lru-cache'

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
    clientCacheSchema,
} from './config'

const ignores = [
    '!node_modules',
    '!dist',
    '!.nuxt',
    '!.output',
]

const defaultStorefrontDocuments = [
    '**/*.{gql,graphql,ts,js}',
    '!**/*.admin.{gql,graphql,ts,js}',
    '!**/admin/**/*.{gql,graphql,ts,js}',
    ...ignores,
]

const defaultAdminDocuments = [
    '**/*.admin.{gql,graphql,ts,js}',
    '**/admin/**/*.{gql,graphql,ts,js}',
    ...ignores,
]

const defaultCacheOptions = {
    short: { maxAge: 1, staleMaxAge: 9, swr: true },
    long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
} as Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>>

const defaultClientCacheOptions = { ttl: 10 * 1000 } as LRUDriverOptions
const defaultProxyCacheOptions = { driver: 'lru-cache' } as StorageMounts[string]

const defaultCacheConfig = { client: defaultClientCacheOptions, proxy: defaultProxyCacheOptions, options: defaultCacheOptions }

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

const clientCacheSchemaWithDefaults = clientCacheSchema.omit({
    client: true,
    proxy: true,
    options: true,
}).extend({
    client: clientCacheSchema.shape.client.default(defaultClientCacheOptions).transform(v => v === true ? defaultClientCacheOptions : v),
    proxy: clientCacheSchema.shape.proxy.default(defaultProxyCacheOptions).transform(v => v === true ? defaultProxyCacheOptions : v),
    options: clientCacheSchema.shape.options.default(defaultCacheOptions),
})

const storefrontClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    publicAccessToken: storefrontClientSchema.shape.publicAccessToken,
    privateAccessToken: storefrontClientSchema.shape.privateAccessToken,
    mock: storefrontClientSchema.shape.mock,

    documents: storefrontClientSchema.shape.documents.transform(v => v ? v : defaultStorefrontDocuments),
    proxy: storefrontClientSchema.shape.proxy.default({ path: '_proxy/storefront' }).transform(v => typeof v === 'undefined' || v === true ? { path: '_proxy/storefront' } : v),
    cache: clientCacheSchemaWithDefaults.or(z.boolean()).optional().default(defaultCacheConfig).transform(v => v === true ? defaultCacheConfig : v),
})

const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    documents: adminClientSchema.shape.documents.transform(v => v ? v : defaultAdminDocuments),

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
            cache: true,
        }).and(z.object({
            proxy: z.object({
                path: z.string().optional().default('_proxy/storefront'),
            }).or(z.boolean()).optional().default({ path: '_proxy/storefront' }).transform(v => typeof v === 'undefined' || v === true ? { path: '_proxy/storefront' } : v),

            cache: clientCacheSchemaWithDefaults.omit({
                proxy: true,
            }).or(z.boolean()).optional().default({
                client: defaultClientCacheOptions,
                options: defaultCacheOptions,
            }).transform(v => typeof v === 'undefined' || v === true ? { client: defaultClientCacheOptions, options: defaultCacheOptions } : v),
        })).optional(),
    }),

    errors: moduleOptionsSchemaWithDefaults.shape.errors,
})
