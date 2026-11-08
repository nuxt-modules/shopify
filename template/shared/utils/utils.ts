import type { CountryCode, LanguageCode } from '#shopify/storefront'

import { z } from 'zod'

export const localizationParamsSchema = z.object({
  language: z.string().min(2).max(3).toUpperCase().transform(value => value as LanguageCode),
  country: z.string().length(2).toUpperCase().transform(value => value as CountryCode),
})

export const connectionParamsSchema = z.object({
  first: z.number().optional(),
  last: z.number().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
})
