import { describe, expect, it } from 'vitest'

import { collectSpreads, scanDefinitions } from '#src/runtime/utils/graphql/scanner'
import { normalizeOperation } from '#src/runtime/utils/graphql/normalize'

const IMAGE = `fragment ImageFields on Image {
  url
  altText
}`

const PRICE = `fragment PriceFields on MoneyV2 {
  amount
  currencyCode
}`

const PRODUCT = `fragment ProductFields on Product {
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

const QUERY = `#graphql
  query FetchProduct($handle: String) {
    product(handle: $handle) {
      ...ProductFields
    }
  }
`

const names = (source: string) => scanDefinitions(source).map(definition => `${definition.kind}:${definition.name ?? '<anonymous>'}`)

describe('scanner', () => {
  it('finds operations and fragments at the top level', () => {
    expect(names(QUERY + IMAGE + PRODUCT)).toStrictEqual([
      'operation:FetchProduct',
      'fragment:ImageFields',
      'fragment:ProductFields',
    ])
  })

  it('treats bare selection set as an anonymous query', () => {
    expect(names('#graphql\n{ shop { name } }')).toStrictEqual(['operation:<anonymous>'])
  })

  it('does not mistake an unresolved interpolation for a selection set', () => {
    expect(names('#graphql\n query Foo { shop { name } }\n ${IMAGE_FRAGMENT}\n')).toStrictEqual(['operation:Foo'])
  })

  it('ignores braces and definitions inside strings and comments', () => {
    const source = `#graphql
      # fragment Commented on Thing { id }
      query Foo {
        # closes early }
        search(query: "a } b") {
          nodes { id }
        }
      }
      fragment After on Shop { name }
    `

    expect(names(source)).toStrictEqual(['operation:Foo', 'fragment:After'])
  })

  it('ignores inline type conditions when collecting spreads', () => {
    const source = `{
      media {
        ... on MediaImage { id }
        ...MediaFields
      }
    }`

    expect([...collectSpreads(source)]).toStrictEqual(['MediaFields'])
  })
})

describe('normalizeOperation', () => {
  it('leaves a correctly assembled operation untouched', () => {
    const source = QUERY + IMAGE + PRICE + PRODUCT

    expect(normalizeOperation(source)).toBe(source)
  })

  it('drops repeated fragment definitions and keeps the first', () => {
    const result = normalizeOperation(QUERY + IMAGE + PRICE + PRODUCT + IMAGE + PRICE)

    expect(names(result)).toStrictEqual([
      'operation:FetchProduct',
      'fragment:ImageFields',
      'fragment:PriceFields',
      'fragment:ProductFields',
    ])
  })

  it('drops fragments with no spreads', () => {
    const unused = `fragment CartFields on Cart {
      id
    }`

    const result = normalizeOperation(QUERY + IMAGE + PRICE + PRODUCT + unused)

    expect(result).not.toContain('CartFields')
    expect(result).toContain('ProductFields')
  })

  it('ignores a fragment-only document', () => {
    const source = `#graphql\n${IMAGE}\n`

    expect(normalizeOperation(source)).toBe(source)
  })

  it('returns the same normalized result on a repeat call', () => {
    const source = QUERY + IMAGE + PRICE + PRODUCT + IMAGE

    expect(normalizeOperation(source)).toBe(normalizeOperation(source))
  })
})
