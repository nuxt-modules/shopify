import { z } from 'zod'

export const connectionParamsSchema = z.object({
    first: z.number({ coerce: true }).optional(),
    last: z.number({ coerce: true }).optional(),
    after: z.string().optional(),
    before: z.string().optional(),
})

export const priceRangeFilterSchema = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
})

export const metafieldFilterSchema = z.object({
    namespace: z.string(),
    key: z.string(),
    value: z.string(),
})

export const variantOptionFilterSchema = z.object({
    name: z.string(),
    value: z.string(),
})

export const categoryFilterSchema = z.object({
    id: z.string(),
})

export const taxonomyMetafieldFilterSchema = z.object({
    namespace: z.string(),
    key: z.string(),
    value: z.string(),
})

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
})

export const productSortKeysSchema = z.enum([
    'BEST_SELLING',
    'COLLECTION_DEFAULT',
    'CREATED',
    'ID',
    'MANUAL',
    'PRICE',
    'RELEVANCE',
    'TITLE',
    'UPDATED_AT',
])

export const productConnectionParamsSchema = connectionParamsSchema.extend({
    sortKey: productSortKeysSchema.optional(),
    reverse: z.boolean().optional(),
    filters: z.array(productFilterSchema).optional(),
})

export const cartLineInputSchema = z.object({
    merchandiseId: z.string(),
    quantity: z.number().min(1),
})
