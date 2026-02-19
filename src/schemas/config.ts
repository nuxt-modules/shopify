import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { ConsolaOptions } from 'consola'
import type { CacheOptions, StorageMounts } from 'nitropack'
import type { LRUDriverOptions } from 'unstorage/drivers/lru-cache'

import { z } from 'zod'

export enum ShopifyClientType {
    Storefront = 'storefront',
    Admin = 'admin',
}

export const clientSchema = z.object({
    apiVersion: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    retries: z.number().optional(),
    sandbox: z.boolean().optional(),
    documents: z.array(z.string()).optional(),
    autoImport: z.boolean().optional(),
    codegen: z.object({
        skip: z.boolean().optional(),
        pluginOptions: z.object({
            typescript: z.any().transform(v => v as TypeScriptPluginConfig).optional(),
        }).optional(),
    }).optional(),
})

export const storefrontClientSchema = clientSchema.extend({
    publicAccessToken: z.string().optional(),
    privateAccessToken: z.string().optional(),
    mock: z.boolean().optional(),
    cache: z.any().transform(v => v as LRUDriverOptions).or(z.boolean()).optional(),
    proxy: z.object({
        path: z.string().optional(),
        cache: z.object({
            storage: z.any().transform(v => v as StorageMounts[string]).or(z.string()).optional(),
            options: z.record(z.string(), z.any().transform(v => v as Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>)).optional(),
        }).or(z.boolean()).optional(),
    }).or(z.boolean()).optional(),
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
        paths: z.array(z.string()).optional(),
        autoImport: z.boolean().optional(),
    }).optional(),

    webhooks: z.object({
        secret: z.string(),

        hooks: z.array(z.object({
            uri: z.string(),
            topic: z.string(),
            format: z.enum(['JSON', 'XML']).default('JSON').optional(),
            filter: z.string().optional(),
            includeFields: z.array(z.string()).optional(),
            metafieldNamespaces: z.array(z.string()).optional(),
            metafields: z.array(z.object({
                key: z.string(),
                namespace: z.string().optional(),
            })).optional(),
        })).optional(),
    }).optional(),

    logger: z.any().transform(v => v as Partial<ConsolaOptions>).optional(),
})

export const publicModuleOptionsSchema = moduleOptionsSchema.omit({
    clients: true,
    fragments: true,
}).extend({
    clients: z.object({
        [ShopifyClientType.Storefront]: storefrontClientSchema.omit({
            privateAccessToken: true,
            sandbox: true,
            documents: true,
            codegen: true,
            autoImport: true,
            proxy: true,
        }).and(z.object({
            proxy: z.object({
                path: z.string().optional(),
                cache: z.object({
                    options: z.record(z.string(), z.any().transform(v => v as Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>)).optional(),
                }).optional(),
            }).optional(),
        })).optional().optional(),
    }),
})
