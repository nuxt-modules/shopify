export const OPTION_FRAGMENT = `#graphql
  fragment ProductOptionFields on ProductOption {
    id
    name
    optionValues {
      id
      name
    }
  }
`
