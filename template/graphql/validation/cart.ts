import { z } from 'zod'

export const cartGetInputSchema = localizationParamsSchema.extend({
    id: z.string().min(1),
})

export const cartLineInputSchema = localizationParamsSchema.extend({
    cartId: z.string().min(1),
    lines: z.array(z.object({
        merchandiseId: z.string().min(1),
        quantity: z.number().min(1).optional(),
    })),
})

export const cartUpdateInputSchema = localizationParamsSchema.extend({
    cartId: z.string().min(1),
    lines: z.array(z.object({
        id: z.string().min(1),
        quantity: z.number().min(1).optional(),
    })),
})

export const cartRemoveInputSchema = localizationParamsSchema.extend({
    cartId: z.string().min(1),
    lineIds: z.array(z.string().min(1)),
})
