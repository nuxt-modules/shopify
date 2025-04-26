export const CART_LINE_FRAGMENT = `#graphql
  fragment CartLineFields on CartLine {
    id
    quantity
    merchandise {
      ... on ProductVariant {
        ...ProductVariantFields
        product {
          title
        }
      }
    }
    attributes {
      key
      value
    }
    cost {
      amountPerQuantity {
        ...PriceFields
      }
    }
  }
`

export const CART_LINE_CONNECTION_FRAGMENT = `#graphql
  fragment CartLineConnectionFields on BaseCartLineConnection {
    edges {
      cursor
      node {
        ...CartLineFields
      }
    }
  }
  ${CART_LINE_FRAGMENT}
`
