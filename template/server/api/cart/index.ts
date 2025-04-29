import { z } from 'zod'

const schema = z.object({
    id: z.string(),
}).extend({
    lines: connectionParamsSchema,
})

export default defineEventHandler(async (event) => {
    const storefront = useStorefront()

    const query = `#graphql
        query FetchCart($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
            cart(id: $id) {
                id
                checkoutUrl
                totalQuantity
                lines(first: $first, last: $last, after: $after, before: $before) {
                    ...CartLineConnectionFields
                }
                cost {
                    totalAmount {
                        ...PriceFields
                    }
                }
            }
        }
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_LINE_CONNECTION_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
  `

    try {
        const variables = await readValidatedBody(event, schema.parse)
        return await storefront.request(query, {
            variables: {
                id: variables.id,
                ...variables.lines,
            },
        })
    }
    catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    }
})
