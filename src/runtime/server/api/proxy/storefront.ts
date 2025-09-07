import { defineEventHandler, readValidatedBody, getRequestHeaders } from 'h3'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { createStorefrontConfig } from '../../../utils/storefront'

export default defineEventHandler(async (event) => {
    const schema = z.object({
        query: z.string(),
        variables: z.record(z.string(), z.unknown()).optional(),
    })

    const body = await readValidatedBody(event, schema.parse)

    const headers = getRequestHeaders(event) as Record<string, string>

    const { _shopify } = useRuntimeConfig()

    const { apiUrl } = createStorefrontConfig(_shopify)

    return await $fetch(apiUrl, {
        method: event.method,
        headers,
        body,
    })
})
