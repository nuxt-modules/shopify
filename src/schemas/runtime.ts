import type { StorageMounts } from 'nitropack'

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
    documents: storefrontClientSchema.shape.documents.transform(v => [
        '**/*.{gql,graphql,ts,js}',
        '!**/*.admin.{gql,graphql,ts,js}',
        '!**/admin/**/*.{gql,graphql,ts,js}',
        ...ignores,
        ...(v ?? []),
    ]),

    publicAccessToken: storefrontClientSchema.shape.publicAccessToken,
    privateAccessToken: storefrontClientSchema.shape.privateAccessToken,
    mock: storefrontClientSchema.shape.mock,
    cache: storefrontClientSchema.shape.cache,

    proxy: z.object({
        path: z.string().optional().default('_proxy/storefront'),
        cache: z.any().transform(v => v as StorageMounts[string]).or(z.string()).or(z.boolean()).optional().default({
            driver: 'lru-cache',
        }),
    }).optional().default({
        path: '_proxy/storefront',
        cache: {
            driver: 'lru-cache',
        },
    }),
})

const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    documents: adminClientSchema.shape.documents.transform(v => [
        '**/*.admin.{gql,graphql,ts,js}',
        '**/admin/**/*.{gql,graphql,ts,js}',
        ...ignores,
        ...(v ?? []),
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
            proxy: storefrontClientSchemaWithDefaults.omit({
                cache: true,
            }),
        })).optional(),
    }),

    errors: moduleOptionsSchemaWithDefaults.shape.errors,
})
