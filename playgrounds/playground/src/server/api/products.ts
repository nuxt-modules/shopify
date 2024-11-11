export default defineEventHandler(async () => {
    const products = await useStorefront().then((storefront) => {
        return storefront?.request(`
            #graphql
            query GetProducts($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                    nodes {
                        id
                        title
                        descriptionHtml
                    }
                }
            }
        `, {
            first: 10,
            after: null,
        })
    })

    return products?.data
})
