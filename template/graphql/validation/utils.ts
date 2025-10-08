import type { CountryCode, LanguageCode } from '#shopify/storefront'

import { z } from 'zod'

export const localizationParamsSchema = z.object({
    language: z.string().min(2).max(2).toUpperCase().optional().transform(val => val as LanguageCode),
    country: z.string().min(2).max(2).toUpperCase().optional().transform(val => val as CountryCode),
})

export const connectionParamsSchema = z.object({
    first: z.number().optional(),
    last: z.number().optional(),
    after: z.string().optional(),
    before: z.string().optional(),
})

export const predictiveSearchParamsSchema = z.object({
    query: z.string(),
    first: z.number().optional().default(5),
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
