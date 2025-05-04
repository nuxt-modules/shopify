export default defineEventHandler(async (event) => {
    const input = await readValidatedBody(event, customerAccessTokenCreateSchema.parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
        mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
                ...CustomerAccessTokenCreateFields
            }
        }
        ${CUSTOMER_ACCESS_TOKEN_CREATE_FRAGMENT}
    `, {
        variables: {
            input,
        },
    })

    if (errors) throw createError(errors)

    return data
})
