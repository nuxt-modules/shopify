export const CART_LINE_FRAGMENT = `#graphql
  fragment CartLineFields on CartLine {
    id
    quantity
    cost {
      amountPerQuantity {
        amount
        currencyCode
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        title
        image {
          url
          altText
        }
        product {
          id
          handle
          title
          vendor
        }
      }
    }
  }
`

export const CART_FRAGMENT = `#graphql
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 250) {
      edges {
        node {
          ...CartLineFields
        }
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
    }
  }
`

export const CART_USER_ERROR_FRAGMENT = `#graphql
  fragment CartUserErrorFields on CartUserError {
    code
    field
    message
  }
`
