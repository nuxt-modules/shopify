export const OPTION_FRAGMENT = `#graphql
  fragment ProductOptionFields on ProductOption {
    name
    optionValues {
      name
      firstSelectableVariant {
        ...ProductVariantFields
      }
    }
  }
`
