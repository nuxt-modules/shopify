export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, connectionParamsSchema.merge(localizationParamsSchema).parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
        query FetchCollections($after: String, $before: String, $first: Int, $last: Int, $language: LanguageCode)
        @inContext(language: $language) {
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

    if (errors) throw createError(errors)

    return data
})
