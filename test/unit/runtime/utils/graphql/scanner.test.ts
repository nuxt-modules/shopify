import { describe, expect, it } from 'vitest'

import { collectSpreads } from '#src/runtime/utils/graphql/scanner'
import { IMAGE, PRODUCT, QUERY, names } from '#test/helpers/graphql'

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
