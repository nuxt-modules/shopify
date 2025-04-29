import type { ModuleOptions } from '../types'

import { z } from 'zod'

export const useShopifyConfigValidation = (options: ModuleOptions) => {
    const clientSchema = z.object({
        apiVersion: z.string().min(1),
        sandbox: z.boolean().optional(),
        documents: z.array(z.string().min(1)).optional(),
        retries: z.number().optional(),
        skipCodegen: z.boolean().optional(),
    })

    const schema = z.object({
        name: z.string().min(1),
        logger: z.any().optional(),
        clients: z.object({
            storefront: clientSchema.extend({
                publicAccessToken: z.string().min(1).optional(),
                privateAccessToken: z.string().min(1).optional(),
                clientName: z.string().min(11).optional(),
            }).optional(),
            admin: clientSchema.extend({
                accessToken: z.string().min(1),
                userAgentPrefix: z.string().min(1).optional(),
            }).optional(),
        }),
    })

    return schema.safeParse(options)
}
