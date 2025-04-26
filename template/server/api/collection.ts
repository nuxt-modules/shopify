import { z } from 'zod'

import { COLLECTION_FRAGMENT, IMAGE_FRAGMENT, PRICE_FRAGMENT, PRODUCT_CONNECTION_FRAGMENT } from '../graphql'
import { connectionParamsSchema } from '../graphql/validation'
import { extract } from '../utils/extract'

const schema = z.object({
    handle: z.string(),
}).extend({
    products: connectionParamsSchema,
})

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, schema.parse)
    const storefront = useStorefront()

    return storefront.request(`#graphql
        query FetchCollection(
            $handle: String,
            $after: String,
            $before: String,
            $first: Int,
            $last: Int,
            $reverse: Boolean,
            $sortKey: ProductCollectionSortKeys,
            $filters: [ProductFilter!]
        ) {
            collection(handle: $handle) {
                ...CollectionFields
                products(
                    after: $after,
                    before: $before,
                    first: $first,
                    last: $last,
                    reverse: $reverse,
                    sortKey: $sortKey,
                    filters: $filters
                ) {
                    ...ProductConnectionFields
                }
            }
        }
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${COLLECTION_FRAGMENT}
        ${PRODUCT_CONNECTION_FRAGMENT}
    `, {
        variables: {
            handle: variables.handle,
            ...variables.products,
        },
    }).then(extract).catch((error) => {
        console.log(error)
    })
})
