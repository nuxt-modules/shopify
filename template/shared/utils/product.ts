import { z } from 'zod'

export const productFilterSchema = z.object({
  available: z.boolean().optional(),
  category: categoryFilterSchema.optional(),
  price: priceRangeFilterSchema.optional(),
  productMetafield: metafieldFilterSchema.optional(),
  productType: z.string().optional(),
  productVendor: z.string().optional(),
  tag: z.string().optional(),
  taxonomyMetafield: taxonomyMetafieldFilterSchema.optional(),
  variantMetafield: metafieldFilterSchema.optional(),
  variantOption: variantOptionFilterSchema.optional(),
}).array()

export const productSortKeysSchema = z.enum([
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

export const productCollectionSortKeysSchema = z.enum([
  'BEST_SELLING',
  'COLLECTION_DEFAULT',
  'CREATED',
  'ID',
  'MANUAL',
  'PRICE',
  'RELEVANCE',
  'TITLE',
])

export const productConnectionParamsSchema = connectionParamsSchema.extend({
  sortKey: productSortKeysSchema.optional(),
  reverse: z.boolean().optional(),
  filters: productFilterSchema.optional(),
})

export const productInputSchema = z.object({
  handle: z.string(),
  selectedOptions: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
}).extend(localizationParamsSchema.shape)
