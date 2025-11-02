import { z } from 'zod'

export default defineCachedEventHandler(async (event) => {
    const schema = z.object({
        handle: z.string(),
        first: z.preprocess(Number, z.number()),
    })

    const query = await getValidatedQuery(event, schema.parse)

    const storefront = useStorefront()

    const { data } = await storefront.request(`#graphql
        query FetchProducts(
            $handle: String,
            $after: String,
            $before: String,
            $first: Int,
            $last: Int,
        ) {
            collection(handle: $handle) {
                products(
                    after: $after,
                    before: $before,
                    first: $first,
                    last: $last,
                ) {
                    edges {
                        cursor
                        node {
                            id
                            title
                            description
                        }
                    }
                }
            }
        }
    `, {
        variables: query,
    })

    return flattenConnection(data?.collection?.products)
})
