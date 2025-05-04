export default defineEventHandler(async (event) => {
    const input = await readValidatedBody(event, customerCreateSchema.parse)

    const storefront = useStorefront()

    const { data, errors } = await storefront.request(`#graphql
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

    if (errors) throw createError(errors)

    if (!data?.customerCreate) throw createError('Login failed')

    await setUserSession(event, { user: data.customerCreate })

    return data
})
