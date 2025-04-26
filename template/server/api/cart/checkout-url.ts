import { z } from 'zod'

const schema = z.object({
    id: z.string(),
})

export default defineEventHandler(async (event) => {
    const storefront = useStorefront()

    const query = `#graphql
    query FetchCartCheckoutUrl($id: ID!) {
        cart(id: $id) {
            id
            checkoutUrl
        }
    }
  `

    try {
        const variables = await readValidatedBody(event, schema.parse)
        return await storefront.request(query, { variables }).then(extract)
    }
    catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    }
})
