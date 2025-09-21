export const PRODUCT_VARIANT_FRAGMENT = `#graphql
    fragment ProductVariantFields on ProductVariant {
        id
        title
        availableForSale
        sku
        price {
            ...PriceFields
        }
        image {
            ...ImageFields
        }
        product {
            title
        }
    }
`

export const PRODUCT_VARIANT_CONNECTION_FRAGMENT = `#graphql
    fragment ProductVariantConnectionFields on ProductVariantConnection {
        edges {
            cursor
            node {
                ...ProductVariantFields
            }
        }
    }
    ${PRODUCT_VARIANT_FRAGMENT}
`

export const PRODUCT_FRAGMENT = `#graphql
    fragment ProductFields on Product {
        id
        handle
        title
        description
        featuredImage {
            ...ImageFields
        }
        priceRange {
            minVariantPrice {
                ...PriceFields
            }
            maxVariantPrice {
                ...PriceFields
            }
        }
        productType
        tags
        descriptionHtml
        availableForSale
        vendor
        variants(first: 250) {
            ...ProductVariantConnectionFields
        }
    }
    ${PRODUCT_VARIANT_CONNECTION_FRAGMENT}
`

export const PRODUCT_CONNECTION_FRAGMENT = `#graphql
    fragment ProductConnectionFields on ProductConnection {
        edges {
            cursor
            node {
                ...ProductFields
            }
        }
        filters {
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
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
    }
    ${PRODUCT_FRAGMENT}
`

export const PRODUCT_FILTERS_FRAGMENT = `#graphql
    fragment ProductFilterFields on ProductConnection {
        filters {
            id
            label
            presentation
            type
            values {
                count
                id
                label
                input
                swatch {
                    image {
                        id
                        alt
                        mediaContentType
                        image {
                            ...ImageFields
                        }
                    }
                }
                image {
                    id
                    alt
                    mediaContentType
                    image {
                        ...ImageFields
                    }
                }
            }
        }
    }
`
