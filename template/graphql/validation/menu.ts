import { z } from 'zod'

export const menuGetInputSchema = localizationParamsSchema.extend({
    handle: z.string().min(1),
})
