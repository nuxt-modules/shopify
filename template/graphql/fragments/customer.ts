export const CUSTOMER_CREATE_FRAGMENT = `#graphql
    fragment CustomerCreateFields on CustomerCreatePayload {
        customer {
            firstName
            lastName
            email
            phone
            acceptsMarketing
        }
        customerUserErrors {
            field
            message
            code
        }
    }
`

export const CUSTOMER_ACCESS_TOKEN_CREATE_FRAGMENT = `#graphql
    fragment CustomerAccessTokenCreateFields on CustomerAccessTokenCreatePayload {
        customerAccessToken {
            accessToken
            expiresAt
        }
    }
`
