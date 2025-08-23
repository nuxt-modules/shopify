import { MARKET_FRAGMENT } from '~~/graphql/market.admin'

export default defineEventHandler(async () => {
    const admin = useAdmin()

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
