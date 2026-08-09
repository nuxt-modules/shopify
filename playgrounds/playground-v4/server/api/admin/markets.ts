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
  `)

  return flattenConnection(data?.markets)
})
