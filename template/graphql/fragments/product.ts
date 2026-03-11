export const PRODUCT_VARIANT_FRAGMENT = `#graphql
    fragment ProductVariantFields on ProductVariant {
        id
        title
        availableForSale
        selectedOptions {
            name
            value
        }
        sku
        price {
            ...PriceFields
        }
        image {
            ...ImageFields
        }
        product {
            handle
        }
    }
`

export const PRODUCT_OPTION_FRAGMENT = `#graphql
    fragment ProductOptionFields on ProductOption {
        id
        name
        optionValues {
            id
            name
            firstSelectableVariant {
                ...ProductVariantFields
            }
            swatch {
                color
                image {
                    alt
                    id
                    mediaContentType
                    previewImage {
                        ...ImageFields
                    }
                }
            }
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
        images(first: 250) {
            edges {
                node {
                    ...ImageFields
                }
            }
        }
        options(first: 250) {
            ...ProductOptionFields
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
        selectedOrFirstAvailableVariant {
            ...ProductVariantFields
        }
        variants(first: 250) {
            ...ProductVariantConnectionFields
        }
    }
    ${PRODUCT_OPTION_FRAGMENT}
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
