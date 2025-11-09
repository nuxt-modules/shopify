import type { ConsolaOptions } from 'consola'
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'

import {
    getCurrentApiVersion,
    getCurrentSupportedApiVersions,
} from '@shopify/graphql-client'
import { z } from 'zod'

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

const cacheDefaults = {
    max: 500,
    maxSize: 5000, // approx. 5MB
    ttl: 1000 * 60 * 5, // 5 minutes
}

export const cacheSchema = z.boolean().or(z.object({
    max: z.number().optional(),
    maxSize: z.number().optional(),
    ttl: z.number().optional(),
    allowStale: z.boolean().optional(),
    updateAgeOnGet: z.boolean().optional(),
    updateAgeOnHas: z.boolean().optional(),
}))

export const clientSchema = z.object({
    apiVersion: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    retries: z.number().optional(),
    sandbox: z.boolean().optional(),
    documents: z.array(z.string()).optional(),
    autoImport: z.boolean().optional(),
    cache: cacheSchema.optional(),
    codegen: z.object({
        skip: z.boolean().optional(),
        pluginOptions: z.object({
            typescript: z.any().transform(v => v as Partial<TypeScriptPluginConfig> | undefined).optional(),
        }).optional(),
    }).optional(),
})

export const storefrontClientSchema = clientSchema.extend({
    publicAccessToken: z.string().optional(),
    privateAccessToken: z.string().optional(),
    proxy: z.boolean().optional().or(z.string().optional()),
    mock: z.boolean().optional(),
})

export const adminClientSchema = clientSchema.extend({
    accessToken: z.string(),
})

export const moduleOptionsSchema = z.object({
    name: z.string({
        error: 'Shop name is required',
    }),

    clients: z.object({
        [ShopifyClientType.Storefront]: storefrontClientSchema.optional(),
        [ShopifyClientType.Admin]: adminClientSchema.optional(),
    }),

    errors: z.object({
        throw: z.boolean().optional(),
    }).optional(),

    fragments: z.object({
        path: z.string().optional(),
        autoImport: z.boolean().optional(),
    }).optional(),

    logger: z.any().transform(v => v as Partial<ConsolaOptions> | undefined).optional(),
})

export const cacheSchemaWithDefaults = cacheSchema.default(cacheDefaults)
    .transform(v => v === true ? cacheDefaults : v)

export const clientSchemaWithDefaults = clientSchema.omit({
    apiVersion: true,
    retries: true,
    sandbox: true,
    autoImport: true,
    cache: true,
}).extend({
    apiVersion: z.string().refine(v => getCurrentSupportedApiVersions().includes(v), {
        error: v => `Unsupported API version "${v}". Supported versions are: ${getCurrentSupportedApiVersions().join(', ')}`,
    }).optional().default(getCurrentApiVersion().version),

    retries: z.number().optional().default(3),

    sandbox: z.boolean().optional().default(true),
    autoImport: z.boolean().optional().default(true),

    cache: cacheSchemaWithDefaults,
})

export const storefrontClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
}).extend({
    documents: z.array(z.string()).optional().transform(v => [
        '**/*.{gql,graphql,ts,js}',
        '!**/*.admin.{gql,graphql,ts,js}',
        '!**/admin/**/*.{gql,graphql,ts,js}',
        ...ignores,
        ...(v ?? []),
    ]),

    publicAccessToken: z.string().optional(),
    privateAccessToken: z.string().optional(),
    proxy: z.boolean().or(z.string()).optional().default(true),
    mock: z.boolean().optional(),
}).refine(client => client?.mock || client?.privateAccessToken || client?.publicAccessToken, {
    error: 'Either a public or private access token must be provided for the storefront client',
})

export const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
    documents: true,
    autoImport: true,
}).extend({
    documents: z.array(z.string()).optional().transform(v => [
        '**/*.admin.{gql,graphql,ts,js}',
        '**/admin/**/*.{gql,graphql,ts,js}',
        ...ignores,
        ...(v ?? []),
    ]),

    autoImport: z.boolean().optional(),

    accessToken: z.string({
        error: 'Access token is required for the admin client',
    }),
})

export const publicModuleOptionsSchema = moduleOptionsSchema.omit({
    clients: true,
    fragments: true,
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
})

export const publicConfigSchema = publicModuleOptionsSchema

export const configSchema = moduleOptionsSchema.omit({
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
}).transform(config => ({
    config,
    publicConfig: publicConfigSchema.parse(config),
}))
