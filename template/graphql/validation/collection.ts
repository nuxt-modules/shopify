import { z } from 'zod'

export const collectionProductsInputSchema = z.object({
    handle: z.string(),
    filters: productFilterSchema.optional(),
}).extend(connectionParamsSchema.shape).extend(localizationParamsSchema.shape)
