import { z } from 'zod'

export const collectionInputSchema = z.object({
    handle: z.string(),
    filters: productFilterSchema.optional(),
}).extend(connectionParamsSchema.shape).extend(localizationParamsSchema.shape)
