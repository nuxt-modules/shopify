export const IMAGE_FRAGMENT = `#graphql
    fragment ImageFields on Image {
        height
        width
        altText
        url
    }
`

export const PRICE_FRAGMENT = `#graphql
    fragment PriceFields on MoneyV2 {
        amount
        currencyCode
    }
`
