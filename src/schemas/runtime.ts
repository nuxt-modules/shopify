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

export const clientSchemaWithDefaults = clientSchema.omit({
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

export const storefrontClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
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
    proxy: storefrontClientSchema.shape.proxy.default(true).transform(v => v === false ? undefined : v === true ? '/_proxy/storefront' : v),
    mock: storefrontClientSchema.shape.mock,
}).refine(client => client?.mock || client?.privateAccessToken || client?.publicAccessToken, {
    error: 'Either a public or private access token must be provided for the storefront client',
})

export const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
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
        })).optional(),

        [ShopifyClientType.Admin]: adminClientSchemaWithDefaults.optional(),
    }),

    errors: z.object({
        throw: z.boolean().optional().default(true),
    }).optional().default({
        throw: true,
    }),

    fragments: z.object({
        path: z.string().optional().default('/graphql'),
        autoImport: z.boolean().optional().default(true),
    }).optional().default({
        path: '/graphql',
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
        }).optional(),
    }),

    errors: moduleOptionsSchemaWithDefaults.shape.errors,
})
