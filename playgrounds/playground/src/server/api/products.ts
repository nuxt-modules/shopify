import { z } from 'zod'

export const schema = z.object({
    after: z.string().optional(),
    before: z.string().optional(),
    first: z.number().optional(),
    last: z.number().optional(),
    query: z.string().optional(),
    reverse: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
    const params = getValidatedRouterParams(event, schema.parse)
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
        variables: {
            first: 1,
        },
    })
})
