import { describe, expect, it } from 'vitest'

import { findFileLiterals, findGraphqlLiterals } from '#src/utils/graphql/literals'

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

describe('findFileLiterals', () => {
  const VUE_FILE = '<template>\n  <p>Don\'t miss out</p>\n</template>\n\n<script lang="ts">\nexport const PRODUCT_CARD = `#graphql\n  fragment ProductCard on Product { title }\n`\n</script>\n\n<script setup lang="ts">\nconst query = `#graphql\n  query Shop { shop { name } }\n`\n</script>\n'

  it('reads the scripts of a Vue file only, as an apostrophe in its template would hide them', () => {
    const literals = findFileLiterals('ProductCard.vue', VUE_FILE)

    expect(literals.map(literal => [literal.binding, literal.content])).toStrictEqual([
      ['PRODUCT_CARD', '#graphql\n  fragment ProductCard on Product { title }\n'],
      ['query', '#graphql\n  query Shop { shop { name } }\n'],
    ])
  })

  it('points to the literals of a Vue file within the whole file', () => {
    for (const literal of findFileLiterals('ProductCard.vue', VUE_FILE)) {
      expect(VUE_FILE.slice(literal.start, literal.end)).toBe(literal.content)
    }
  })

  it.each(['"', '\''])('reads a script whose attribute value in %s quotes contains a >, such as a generic type', (quote) => {
    const code = `<script setup lang=${quote}ts${quote} generic=${quote}T extends Record<string, unknown>${quote}>\nconst query = \`#graphql\n  query Shop { shop { name } }\n\`\n</script>\n`

    const literals = findFileLiterals('ProductList.vue', code)

    expect(literals.map(literal => [literal.binding, literal.content])).toStrictEqual([['query', '#graphql\n  query Shop { shop { name } }\n']])
    expect(code.slice(literals[0]!.start, literals[0]!.end)).toBe(literals[0]!.content)
  })

  it('reads any other file as code', () => {
    const code = 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n'

    expect(findFileLiterals('shop.ts', code)).toStrictEqual(findGraphqlLiterals(code))
  })
})
