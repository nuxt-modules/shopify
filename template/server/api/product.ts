import { z } from 'zod'

import { IMAGE_FRAGMENT, PRICE_FRAGMENT, PRODUCT_FRAGMENT } from '../graphql'
import { extract } from '../utils/extract'

const schema = z.object({
    handle: z.string(),
})

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, schema.parse)
    const storefront = useStorefront()

    return storefront.request(`#graphql
        query FetchProduct($handle: String) {
            product(handle: $handle) {
                ...ProductFields
            }
        }
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${PRODUCT_FRAGMENT}
    `, {
        variables: {
            handle: variables.handle,
        },
    }).then(extract).catch((error) => {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    })
})
