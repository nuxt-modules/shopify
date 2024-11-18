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

    const response = await storefront.request(`#graphql
        query FetchProducts($first: Int) {
            products(first: $first) {
                nodes {
                    id
                    title
                    description
                }
            }
            menu(handle: "main") {
                title
                items {
                    url
                }
            }
        }
    `, {
        variables: {
            first: 1,
        },
    })

    return response.data?.menu
})
