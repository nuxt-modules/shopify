import { z } from 'zod'

export const cartLineInputSchema = z.object({
    merchandiseId: z.string(),
    quantity: z.number().min(1),
})
