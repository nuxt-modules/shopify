import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, z.object({
        handle: z.string(),
    }).parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
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
    })

    if (errors) throw createError(errors)

    return data
})
