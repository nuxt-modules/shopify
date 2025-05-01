import { z } from 'zod'

export const customerCreateSchema = z.object({
    firstName: z.string().min(1).max(255).optional(),
    lastName: z.string().min(1).max(255).optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8).max(255),
    acceptsMarketing: z.boolean().optional(),
})

export const customerAccessTokenCreateSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(255),
})
