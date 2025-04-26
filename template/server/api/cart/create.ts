export default defineEventHandler(async () => {
    const storefront = useStorefront()

    const query = `#graphql
    mutation CreateCart {
        cartCreate {
            cart {
                id
            }
        }
    }
  `

    try {
        return await storefront.request(query).then(extract)
    }
    catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            data: { error },
        })
    }
})
