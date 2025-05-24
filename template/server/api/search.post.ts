import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, z.object({
        query: z.string(),
        first: z.number().optional().default(5),
    }).merge(localizationParamsSchema).parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
        query predictiveSearch($query: String, $first: Int, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
            products(first: $first, query: $query) {
                edges {
                    node {
                        handle
                        title
                        description
                        featuredImage {
                            ...ImageFields
                        }
                    }
                }
            }
            collections(first: $first, query: $query) {
                edges {
                    node {
                        handle
                        title
                        description
                    }
                }
            }
        }
        ${IMAGE_FRAGMENT}
    `, {
        variables,
    })

    if (errors) throw createError(errors)

    return data
})
