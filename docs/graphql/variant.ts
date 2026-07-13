export const VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    image {
      ...ImageFields
    }
    price {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
  }
`
