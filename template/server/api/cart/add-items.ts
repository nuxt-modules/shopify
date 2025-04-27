import { z } from 'zod'

const schema = z.object({
    id: z.string(),
    items: z.array(cartLineInputSchema),
}).extend({
    lines: connectionParamsSchema,
})

export default defineEventHandler(async (event) => {
    const storefront = useStorefront()

    const query = `#graphql
        mutation AddItemToCart(
            $cartId: ID!,
            $items: [CartLineInput!]!,
            $first: Int,
            $last: Int,
            $after: String,
            $before: String
        ) {
            cartLinesAdd(cartId: $cartId, lines: $items) {
                cart {
                    id
                    checkoutUrl
                    totalQuantity
                    lines(first: $first, last: $last, after: $after, before: $before) {
                        ...CartLineConnectionFields
                        edges {
                            node {
                                id
                                quantity
                            }
                        }
                    }
                    cost {
                        totalAmount {
                            ...PriceFields
                        }
                    }
                }
                userErrors {
                    field
                    message
                    code
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
        const response = await storefront.request(query, {
            variables: {
                cartId: variables.id,
                items: variables.items,
                ...variables.lines,
            },
        })

        if (response?.data?.cartLinesAdd?.userErrors?.length) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Cart Line Add Error',
                data: { errors: response.data.cartLinesAdd.userErrors },
            })
        }

        return extract(response)
    }
    catch (error) {
        console.error('Error adding items to cart:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    }
})
