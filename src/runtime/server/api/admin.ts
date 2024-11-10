import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from '#imports'
import { useAdmin } from '~/src/runtime/server/utils/useAdmin'

const schema = z.object({
    query: z.string(),
    variables: z.record(z.any()),
})

export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, schema.parse)
    const admin = useAdmin()

    if (!admin) return

    return {
        admin,
    }
})
