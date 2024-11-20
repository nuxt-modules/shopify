import { z } from 'zod'

import { useAdmin } from '../utils/useAdmin'
import { useStorefront } from '../utils/useStorefront'

import { defineEventHandler, readValidatedBody } from '#imports'

const schema = z.object({
    query: z.string(),
    variables: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, schema.parse)

    const clientType = event.node.req.url?.split('/').pop()
    if (!clientType) throw new Error('The requested client is not supported')

    let client: ReturnType<typeof useStorefront> | ReturnType<typeof useAdmin>
    switch (clientType) {
        case 'storefront':
            client = useStorefront()
            break
        case 'admin':
            client = useAdmin()
            break
        default:
            throw new Error('The requested client is not supported')
    }

    return client.request(body.query, {
        variables: body.variables,
    })
})
