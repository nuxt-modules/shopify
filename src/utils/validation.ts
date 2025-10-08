import type { ModuleOptions } from '../types'

import { z } from 'zod'

export const useShopifyConfigValidation = (options: ModuleOptions) => {
    const clientSchema = z.object({
        apiVersion: z.string().min(1),
        headers: z.record(z.string(), z.string()).optional(),
        retries: z.number().optional(),
        sandbox: z.boolean().optional(),
        documents: z.array(z.string().min(1)).optional(),
        skipCodegen: z.boolean().optional(),
    })

    const schema = z.object({
        name: z.string().min(1),

        logger: z.any().optional(),

        autoImports: z.object({
            graphql: z.boolean().optional().default(true),
            storefront: z.boolean().optional().default(true),
            admin: z.boolean().optional().default(true),
        }).optional().default({
            graphql: true,
            storefront: true,
            admin: true,
        }),

        errors: z.object({
            throw: z.boolean().optional().default(true),
        }).optional().default({
            throw: true,
        }),

        clients: z.object({
            storefront: clientSchema.extend({
                publicAccessToken: z.string().min(1).optional(),
                privateAccessToken: z.string().min(1).optional(),
                proxy: z.boolean().optional().default(true).or(z.string().optional()),
                mock: z.boolean().optional(),
            }).optional(),

            admin: clientSchema.extend({
                accessToken: z.string().min(1),
            }).optional(),
        }),
    })

    return schema.safeParse(options) satisfies z.ZodSafeParseResult<ModuleOptions>
}
