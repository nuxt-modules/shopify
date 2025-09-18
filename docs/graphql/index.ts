export const COLLECTION_FRAGMENT = `#graphql
    fragment CollectionFields on Collection {
        id
        title
        description
    }
`

export const PRODUCT_FRAGMENT = `#graphql
    fragment ProductFields on Product {
        id
        handle
        title
        description
        featuredImage {
            url
            altText
            height
            width
        }
        priceRange {
            minVariantPrice {
                amount
                currencyCode
            }
        }
    }
`

export const PRODUCT_CONNECTION_FRAGMENT = `#graphql
    fragment ProductConnectionFields on ProductConnection {
        edges {
            cursor
            node {
                ...ProductFields
            }
        }
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
    }
    ${PRODUCT_FRAGMENT}
`
