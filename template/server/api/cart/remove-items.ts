import { z } from 'zod'

import { CART_LINE_CONNECTION_FRAGMENT, IMAGE_FRAGMENT, PRICE_FRAGMENT, PRODUCT_VARIANT_FRAGMENT } from '../../graphql'
import { connectionParamsSchema } from '../../graphql/validation'

const schema = z.object({
    id: z.string(),
    lineIds: z.array(z.string()),
}).extend({
    lines: connectionParamsSchema,
})

export default defineEventHandler(async (event) => {
    const storefront = useStorefront()

    const query = `#graphql
        mutation RemoveItemsFromCart(
            $cartId: ID!,
            $lineIds: [ID!]!,
            $first: Int,
            $last: Int,
            $after: String,
            $before: String
        ) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
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
                lineIds: variables.lineIds,
                ...variables.lines,
            },
        })

        if (response?.data?.cartLinesRemove?.userErrors?.length) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Cart Line Remove Error',
                data: { errors: response.data.cartLinesRemove.userErrors },
            })
        }

        return extract(response)
    }
    catch (error) {
        console.error('Error removing items from cart:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    }
})
