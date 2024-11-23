export default defineCachedEventHandler(async (event) => {
    const query = await getValidatedQuery(event, schema.parse)
    const storefront = useStorefront()

    return storefront.request(`#graphql
    query FetchProducts($first: Int) {
        products(first: $first) {
            nodes {
                id
                title
                description
                descriptionHtml
            }
        }
    }
    `, {
        variables: query,
    })
})
