export const MARKET_FRAGMENT = `#graphql
    fragment MarketFields on Market {
        name
        webPresence {
            rootUrls {
                locale
                url
            }
        }
    }
`
