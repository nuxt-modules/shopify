import { describe, expect, it } from 'vitest'

import type { FragmentRegistry } from '../../src/utils/graphql/registry'

import { findGraphqlLiterals } from '../../src/utils/graphql/literals'
import { normalizeOperation } from '../../src/runtime/utils/graphql/normalize'
import { scanDefinitions } from '../../src/runtime/utils/graphql/scanner'
import { touchesFragments } from '../../src/setup/graphql-transform'
import { transformGraphqlLiterals } from '../../src/utils/graphql/transform'

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
    price {
      ...PriceFields
    }
  }`

function registry(): FragmentRegistry {
  return {
    fragments: new Map([
      ['ImageFields', { name: 'ImageFields', text: IMAGE, spreads: [], file: 'graphql/utils.ts' }],
      ['PriceFields', { name: 'PriceFields', text: PRICE, spreads: [], file: 'graphql/utils.ts' }],
      ['ProductFields', { name: 'ProductFields', text: PRODUCT, spreads: ['ImageFields', 'PriceFields'], file: 'graphql/product.ts' }],
    ]),
    provides: new Map([
      ['IMAGE_FRAGMENT', new Set(['ImageFields'])],
      ['PRICE_FRAGMENT', new Set(['PriceFields'])],
      ['PRODUCT_FRAGMENT', new Set(['ProductFields', 'ImageFields', 'PriceFields'])],
    ]),
  }
}

const transform = (code: string, file = '/project/app/pages/product/[handle].vue') =>
  transformGraphqlLiterals(code, file, { resolveRegistry: () => registry() })

const definitions = (code: string) => {
  const literal = findGraphqlLiterals(code).at(0)!

  return scanDefinitions(literal.content).map(definition => `${definition.kind}:${definition.name ?? '<anonymous>'}`)
}

describe('findGraphqlLiterals', () => {
  it('picks up `#graphql` marker and binding', () => {
    const literals = findGraphqlLiterals('export const PRODUCT_FRAGMENT = `#graphql\n  fragment ProductFields on Product { id }\n`\n')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.binding).toBe('PRODUCT_FRAGMENT')
  })

  it('picks up `/* GraphQL */` marker', () => {
    expect(findGraphqlLiterals('const q = /* GraphQL */ `query Foo { shop { name } }`')).toHaveLength(1)
  })

  it('skips ordinary template literals', () => {
    expect(findGraphqlLiterals('const greeting = `hello ${name}`')).toHaveLength(0)
  })

  it('can handle regex character classes containing backticks', () => {
    const literals = findGraphqlLiterals('const r = /`/\nconst q = `#graphql\n query D { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query D')
  })

  it('can handle regex character classes containing slashes', () => {
    const literals = findGraphqlLiterals('const r = /[/`]/g\nconst q = `#graphql\n query J { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query J')
  })

  it('ignores slashes after operands', () => {
    const literals = findGraphqlLiterals('const n = (a) / 2 / b\nconst q = `#graphql\n query L { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query L')
  })

  it('treats a slash after keywords as regex', () => {
    const literals = findGraphqlLiterals('function f() { return /`/ }\nconst q = `#graphql\n query I { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query I')
  })

  it('can handle nested literals', () => {
    const literals = findGraphqlLiterals('const q = `#graphql\n query Foo { id }\n${cond ? `a` : `b`}\n`\nconst after = 1')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query Foo')
  })
})

describe('fragment injection', () => {
  it('gathers all fragments that another fragment or operation uses', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n`'

    expect(definitions(transform(code)!)).toStrictEqual([
      'operation:FetchProduct',
      'fragment:ImageFields',
      'fragment:PriceFields',
      'fragment:ProductFields',
    ])
  })

  it('does not re-inject when the fragment already exists', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n  ${PRODUCT_FRAGMENT}\n`'

    expect(transform(code)).toBeUndefined()
  })

  it('injects only missing fragments, leaves existing ones as is', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n  ${IMAGE_FRAGMENT}\n`'
    const result = transform(code)!

    expect(result).toContain('fragment ProductFields')
    expect(result).toContain('fragment PriceFields')
    expect(result.match(/fragment ImageFields/g)).toBeNull()
  })

  it('leaves fragment-only literals alone so they stay defined', () => {
    const code = 'export const PRODUCT_FRAGMENT = `#graphql\n  fragment ProductFields on Product {\n    ...ImageFields\n  }\n`'

    expect(transform(code, '/project/graphql/fragments/product.ts')).toBeUndefined()
  })

  it('ignores spreads it cannot resolve', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...UnknownFields }\n  }\n`'

    expect(transform(code)).toBeUndefined()
  })

  it('produces a document that normalizes to itself', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n`'
    const content = findGraphqlLiterals(transform(code)!).at(0)!.content

    expect(normalizeOperation(content)).toBe(content)
  })

  it('injects into an anonymous operation', () => {
    const code = 'const q = `#graphql\n  query {\n    product { ...ProductFields }\n  }\n`'

    expect(transform(code)).toContain('fragment ProductFields')
  })

  it('injects into a bare selection set', () => {
    const code = 'const q = `#graphql\n{ product { ...ProductFields } }\n`'

    expect(transform(code)).toContain('fragment ImageFields')
  })

  it('injects into every operation literal in a file', () => {
    const code = 'const a = `#graphql\n query A { product { ...ProductFields } }\n`\nconst b = `#graphql\n query B { shop { ...ImageFields } }\n`'
    const result = transform(code)!

    expect(result.match(/fragment ProductFields/g)).toHaveLength(1)
    expect(result.match(/fragment ImageFields/g)).toHaveLength(2)
  })
})

describe('fragment watching', () => {
  const dirs = ['/project/graphql']
  const srcDir = '/project/app'
  const rootDir = '/project'

  it('matches a path reported relative to srcDir', () => {
    expect(touchesFragments(dirs, '../graphql/fragments/product.ts', srcDir, rootDir)).toBe(true)
  })

  it('matches a path reported relative to rootDir', () => {
    expect(touchesFragments(dirs, 'graphql/fragments/product.ts', srcDir, rootDir)).toBe(true)
  })

  it('ignores files outside the fragment directories', () => {
    expect(touchesFragments(dirs, 'components/Product.vue', srcDir, rootDir)).toBe(false)
  })

  it('does not match a sibling directory sharing the prefix', () => {
    expect(touchesFragments(dirs, '../graphql-extra/product.ts', srcDir, rootDir)).toBe(false)
  })
})
