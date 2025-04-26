import { z } from 'zod'

export const sortSchema = z.object({
    order: z.enum(['asc', 'desc']),
    by: z.enum(['price', 'title']),
})

export type SortSchema = z.infer<typeof sortSchema>
