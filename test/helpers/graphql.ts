import { scanDefinitions } from '#src/runtime/utils/graphql/scanner'

export const IMAGE = `fragment ImageFields on Image {
  url
  altText
}`

export const PRICE = `fragment PriceFields on MoneyV2 {
  amount
  currencyCode
}`

export const PRODUCT = `fragment ProductFields on Product {
  id
  featuredImage {
    ...ImageFields
  }
  priceRange {
    minVariantPrice {
      ...PriceFields
    }
  }
}`

export const QUERY = `#graphql
  query FetchProduct($handle: String) {
    product(handle: $handle) {
      ...ProductFields
    }
  }
`

export const names = (source: string) => scanDefinitions(source).map(definition => `${definition.kind}:${definition.name ?? '<anonymous>'}`)
