export default defineEventHandler(async (event) => {
    const input = await readValidatedBody(event, customerCreateSchema.parse)

    const storefront = useStorefront()

    const { data } = await storefront.request(`#graphql
        mutation customerCreate($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
                ...CustomerCreateFields
            }
        }
        ${CUSTOMER_CREATE_FRAGMENT}
    `, {
        variables: {
            input,
        },
    })

    return data
})
