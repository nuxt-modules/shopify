export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
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
    name
    optionValues {
      name
      firstSelectableVariant {
        ...ProductVariantFields
      }
      swatch {
        color
        image {
          previewImage {
            ...ImageFields
          }
        }
      }
    }
  }
`

export const PRODUCT_FRAGMENT = `#graphql
  fragment ProductFields on Product {
    id
    handle
    title
    availableForSale
    isGiftCard
    requiresSellingPlan
    images(first: 250) {
      edges {
        node {
          ...ImageFields
        }
      }
    }
    options(first: 250) {
      name
      optionValues {
        name
      }
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
    selectedOrFirstAvailableVariant {
      ...ProductVariantFields
    }
  }
`

export const PRODUCT_FORM_FRAGMENT = `#graphql
  fragment ProductFormFields on Product {
    id
    handle
    title
    isGiftCard
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
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
    }
    sellingPlanGroups(first: 5) {
      edges {
        node {
          name
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariantFields
    }
    adjacentVariants(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariantFields
    }
  }
`

export const PRODUCT_CONNECTION_FRAGMENT = `#graphql
  fragment ProductConnectionFields on ProductConnection {
    edges {
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
`

export const FILTER_FRAGMENT = `#graphql
  fragment FilterFields on Filter {
    id
    label
    type
    values {
      count
      id
      label
      input
      swatch {
        color
      }
    }
  }
`
