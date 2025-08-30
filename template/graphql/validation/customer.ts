import { z } from 'zod'

export const customerCreateSchema = z.object({
    firstName: z.string().optional().transform(value => value?.length === 0 ? undefined : value),
    lastName: z.string().optional().transform(value => value?.length === 0 ? undefined : value),
    email: z.string().email(),
    phone: z.string().optional().transform(value => value?.length === 0 ? undefined : value),
    password: z.string().min(8).max(255),
    acceptsMarketing: z.boolean().optional(),
})

export const customerAccessTokenCreateSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(255),
})
