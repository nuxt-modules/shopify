export const FILTER_FRAGMENT = `#graphql
  fragment FilterFields on Filter {
    id
    label
    type
    values {
      id
      label
      count
      input
    }
  }
`
