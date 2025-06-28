import { z } from 'zod'

export default defineEventHandler(async (event) => {
    const variables = await readValidatedBody(event, z.object({
        handle: z.string(),
    }).merge(localizationParamsSchema).parse)

    const storefront = useStorefront()

    const { data } = await storefront.request(`#graphql
        query FetchProduct($handle: String, $language: LanguageCode, $country: CountryCode) 
        @inContext(language: $language, country: $country) {
            product(handle: $handle) {
                ...ProductFields
            }
        }
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${PRODUCT_FRAGMENT}
    `, {
        variables,
    })

    return data
})
