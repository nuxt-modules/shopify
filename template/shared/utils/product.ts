import { z } from 'zod'

const productSortKeysSchema = z.enum([
  'BEST_SELLING',
  'CREATED_AT',
  'ID',
  'PRICE',
  'PRODUCT_TYPE',
  'RELEVANCE',
  'TITLE',
  'UPDATED_AT',
  'VENDOR',
])

export const productConnectionParamsSchema = connectionParamsSchema.extend({
  sortKey: productSortKeysSchema.optional(),
  reverse: z.boolean().optional(),
})

export const productInputSchema = z.object({
  handle: z.string(),
  selectedOptions: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
}).extend(localizationParamsSchema.shape)
