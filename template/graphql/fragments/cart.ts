export const CART_LINE_FRAGMENT = `#graphql
    fragment CartLineFields on CartLine {
        id
        quantity
        merchandise {
            ... on ProductVariant {
                ...ProductVariantFields

                product {
                    handle
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

export const CART_FRAGMENT = `#graphql
    fragment CartFields on Cart {
        id
        checkoutUrl
        totalQuantity
        lines(first: 250) {
            ...CartLineConnectionFields
        }
        cost {
            totalAmount {
                ...PriceFields
            }
        }
    }
    ${CART_LINE_CONNECTION_FRAGMENT}
`

export const CART_USER_ERRORS_FRAGMENT = `#graphql
    fragment CartUserErrorFields on CartUserError {
        code
        field
        message
    }
`
