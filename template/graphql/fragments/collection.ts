export const COLLECTION_FRAGMENT = `#graphql
    fragment CollectionFields on Collection {
        title
        handle
        description
        image {
            ...ImageFields
        }
        seo {
            description
            title
        }
    }
`

export const COLLECTION_CONNECTION_FRAGMENT = `#graphql
    fragment CollectionConnectionFields on CollectionConnection {
        edges {
            cursor
            node {
                ...CollectionFields
            }
        }
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
    }
`
