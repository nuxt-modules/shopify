import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, z.object({
        handle: z.string(),
    }).merge(localizationParamsSchema).parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
        query FetchCollection(
            $handle: String,
            $language: LanguageCode,
            $country: CountryCode
        )
        @inContext(language: $language, country: $country) {
            collection(handle: $handle) {
                ...CollectionFields
            }
        }
        ${COLLECTION_FRAGMENT}
        ${IMAGE_FRAGMENT}
    `, {
        variables,
    })

    if (errors) throw createError(errors)

    return data
})
