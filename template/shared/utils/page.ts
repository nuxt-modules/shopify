import { z } from 'zod'

export const pageInputSchema = localizationParamsSchema.extend({
  handle: z.string().min(1),
})
