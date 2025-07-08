import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
    collections: {
        content: defineCollection({
            type: 'page',
            source: '**/*.md',
            schema: z.object({
                title: z.string(),
                description: z.string(),
            }),
        }),
    },
})
