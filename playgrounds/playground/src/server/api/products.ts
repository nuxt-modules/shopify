
import { z } from 'zod'

export const fetchProductsOptions = z.object({
    after: z.string().optional(),
    before: z.string().optional(),
    first: z.number().optional(),
    last: z.number().optional(),
    query: z.string().optional(),
    reverse: z.boolean().optional(),
})

export default defineEventHandler(async () => {
    const storefront = useStorefront();





    return await storefront.request(`
        #graphql
        query FetchProducts(
            $after: String
            $before: String
            $first: Int
            $last: Int
            $query: String
            $reverse: Boolean
        ){
            products(
                after: $after
                before: $before
                first: $first
                last: $last
                query: $query
                reverse: $reverse
            ){
                nodes {
                    id
                    title
                    description
                }
            }
        }
    `, {
        variables: {
            first: 1
        },
    })
})
