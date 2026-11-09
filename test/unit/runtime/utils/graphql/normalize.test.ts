import { describe, expect, it } from 'vitest'

import { normalizeOperation } from '#src/runtime/utils/graphql/normalize'
import { IMAGE, PRICE, PRODUCT, QUERY, names } from '#test/helpers/graphql'

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
