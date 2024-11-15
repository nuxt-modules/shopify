import { useStorefront } from '#imports';

export type FetchProductsOptions = {
    after: string
    before: string
    first: number
    last: number
    query: string
    reverse: boolean
}

export default defineEventHandler(async () => {
    const storefront = useStorefront()



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