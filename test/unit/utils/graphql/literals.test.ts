import { describe, expect, it } from 'vitest'

import { findGraphqlLiterals } from '#src/utils/graphql/literals'

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

  it('can handle regex character classes containing slashes', () => {
    const literals = findGraphqlLiterals('const r = /[/`]/g\nconst q = `#graphql\n query J { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query J')
  })

  it('ignores slashes after operands', () => {
    const literals = findGraphqlLiterals('const n = (a) / 2; const q = `#graphql\n query L { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toBe('#graphql\n query L { id }\n')
  })

  it('treats a slash after keywords as regex', () => {
    const literals = findGraphqlLiterals('function f() { return /`/ }\nconst q = `#graphql\n query I { id }\n`')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toContain('query I')
  })

  it('can handle nested literals', () => {
    const literals = findGraphqlLiterals('const q = `#graphql\n query Foo { id }\n${cond ? `}` : `b`}\n`\nconst after = 1')

    expect(literals).toHaveLength(1)
    expect(literals[0]!.content).toBe('#graphql\n query Foo { id }\n${cond ? `}` : `b`}\n')
  })
})
