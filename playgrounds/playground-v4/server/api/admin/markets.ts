export default defineEventHandler(async (event) => {
  const admin = useAdmin(event)

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
