import { z } from 'zod'

export const schema = z.object({
    first: z.preprocess(v => Number(v), z.number()),
})

export default defineEventHandler(async (event) => {
    const query = await getValidatedQuery(event, schema.parse)
    const storefront = useStorefront()

    return storefront.request(`#graphql
        query FetchProducts($first: Int) {
            products(first: $first) {
                nodes {
                    id
                    title
                    description
                }
            }
        }
    `, {
        variables: query,
    })
})
