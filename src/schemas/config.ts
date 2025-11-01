import type { ConsolaOptions } from 'consola'
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'

import {
    getCurrentApiVersion,
    getCurrentSupportedApiVersions,
} from '@shopify/graphql-client'
import { z } from 'zod'

enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

const ignores = [
    '!node_modules',
    '!dist',
    '!.nuxt',
    '!.output',
]

const clientSchema = z.object({
    apiVersion: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    retries: z.number().optional(),
    sandbox: z.boolean().optional(),
    documents: z.array(z.string()).optional(),
    autoImport: z.boolean().optional(),
    codegen: z.object({
        skip: z.boolean().optional(),
        pluginOptions: z.object({
            typescript: z.any().transform(v => v as Partial<TypeScriptPluginConfig> | undefined).optional(),
        }).optional(),
    }).optional(),
})

const storefrontClientSchema = clientSchema.extend({
    publicAccessToken: z.string().optional(),
    privateAccessToken: z.string().optional(),
    proxy: z.boolean().optional().or(z.string().optional()),
    mock: z.boolean().optional(),
})

const adminClientSchema = clientSchema.extend({
    accessToken: z.string(),
})

const moduleOptionsSchema = z.object({
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

const adminClientSchemaWithDefaults = clientSchemaWithDefaults.omit({
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

const publicModuleOptionsSchema = moduleOptionsSchema.omit({
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

const publicConfigSchema = publicModuleOptionsSchema

const configSchema = moduleOptionsSchema.omit({
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

type ModuleOptions = z.infer<typeof moduleOptionsSchema>
type PublicModuleOptions = z.infer<typeof publicModuleOptionsSchema>

type ShopifyConfig = z.infer<typeof configSchema>['config']
type PublicShopifyConfig = z.infer<typeof configSchema>['publicConfig']

export { configSchema, ShopifyClientType }

export type { ModuleOptions, PublicModuleOptions, ShopifyConfig, PublicShopifyConfig }
