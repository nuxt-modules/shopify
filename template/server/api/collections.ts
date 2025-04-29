export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, connectionParamsSchema.parse)
    const storefront = useStorefront()

    return storefront.request(`#graphql
        query FetchCollections($after: String, $before: String, $first: Int, $last: Int) {
            collections(
                after: $after
                before: $before
                first: $first
                last: $last
            ) {
                ...CollectionConnectionFields
            }
        }
        ${IMAGE_FRAGMENT}
        ${COLLECTION_FRAGMENT}
        ${COLLECTION_CONNECTION_FRAGMENT}
    `, {
        variables,
    })
})
