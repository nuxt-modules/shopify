import { z } from 'zod'

export const localizationParamsSchema = z.object({
    language: z.string().min(2).max(2).toUpperCase().optional().transform(val => val as LanguageCode),
    country: z.string().min(2).max(2).toUpperCase().optional().transform(val => val as CountryCode),
})

export const connectionParamsSchema = z.object({
    first: z.number({ coerce: true }).optional(),
    last: z.number({ coerce: true }).optional(),
    after: z.string().optional(),
    before: z.string().optional(),
})

export const predictiveSearchParamsSchema = z.object({
    query: z.string(),
    first: z.number({ coerce: true }).optional().default(5),
}).merge(localizationParamsSchema)

export const priceRangeFilterSchema = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
})

export const metafieldFilterSchema = z.object({
    namespace: z.string(),
    key: z.string(),
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

export const variantOptionFilterSchema = z.object({
    name: z.string(),
    value: z.string(),
})
