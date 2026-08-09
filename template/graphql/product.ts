export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    currentlyNotInStock
    requiresShipping
    selectedOptions {
      name
      value
    }
    price {
      ...PriceFields
    }
    compareAtPrice {
      ...PriceFields
    }
    image {
      ...ImageFields
    }
    product {
      handle
      title
    }
  }
`

export const MEDIA_FRAGMENT = `#graphql
  fragment MediaFields on Media {
    __typename
    id
    alt
    mediaContentType
    previewImage {
      ...ImageFields
    }
    ... on MediaImage {
      image {
        ...ImageFields
      }
    }
    ... on Video {
      sources {
        url
        mimeType
      }
    }
    ... on ExternalVideo {
      embedUrl
      host
    }
    ... on Model3d {
      sources {
        url
        mimeType
      }
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
`

export const PRODUCT_FRAGMENT = `#graphql
  fragment ProductFields on Product {
    id
    handle
    title
    vendor
    description
    productType
    tags
    availableForSale
    isGiftCard
    requiresSellingPlan
    totalInventory
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
    media(first: 250) {
      edges {
        node {
          ...MediaFields
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
    compareAtPriceRange {
      minVariantPrice {
        ...PriceFields
      }
      maxVariantPrice {
        ...PriceFields
      }
    }
    sellingPlanGroups(first: 5) {
      edges {
        node {
          name
        }
      }
    }
    variants(first: 250) {
      ...ProductVariantConnectionFields
    }
    selectedOrFirstAvailableVariant {
      ...ProductVariantFields
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
