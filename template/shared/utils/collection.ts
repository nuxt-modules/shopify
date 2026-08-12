import { z } from 'zod'

export const collectionInputSchema = z.object({
  handle: z.string(),
  sortKey: productCollectionSortKeysSchema.optional().catch(undefined),
  reverse: z.boolean().optional().catch(undefined),
  filters: productFilterSchema.optional(),
}).extend(connectionParamsSchema.shape).extend(localizationParamsSchema.shape)
