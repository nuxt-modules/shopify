export const IMAGE_FRAGMENT = `#graphql
    fragment ImageFields on Image {
        height
        width
        altText
        url
    }
`

export const IMAGE_CONNECTION_FRAGMENT = `#graphql
    fragment ImageConnectionFields on ImageConnection {
        edges {
            cursor
            node {
                ...ImageFields
            }
        }
    }
`

export const PRICE_FRAGMENT = `#graphql
    fragment PriceFields on MoneyV2 {
        amount
        currencyCode
    }
`

export const COUNTRY_FRAGMENT = `#graphql
    fragment CountryFields on Country{
        isoCode
        name

        availableLanguages {
            isoCode
        }

        currency {
            isoCode
            symbol
        }
    }
`
