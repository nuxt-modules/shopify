export const PRODUCT_FORM_FRAGMENT = `#graphql
  fragment ProductFormFields on Product {
    id
    handle
    title
    description
    requiresSellingPlan
    encodedVariantExistence
    encodedVariantAvailability
    featuredImage {
      ...ImageFields
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    options {
      ...ProductOptionFields
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariantFields
    }
    adjacentVariants(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariantFields
    }
  }
`
