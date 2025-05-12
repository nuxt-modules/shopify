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

export const FILTERS_FRAGMENT = `#graphql
  fragment FilterFields on Filter {
    id
    label
    presentation
    type
    values {
      count
      id
      input
      label
    }
  }
`

export const UTILS_FRAGMENT = `
  ${PRICE_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${IMAGE_CONNECTION_FRAGMENT}
`
