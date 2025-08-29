export default defineEventHandler(async () => {
    const admin = useAdmin()

    console.log(admin)

    const { data } = await admin.request(`#graphql
        query FetchMarkets {
            markets(first: 3) {
                nodes {
                    ...MarketFields
                }
            }
        }
        ${MARKET_FRAGMENT}
    `)

    return flattenConnection(data?.markets)
})
