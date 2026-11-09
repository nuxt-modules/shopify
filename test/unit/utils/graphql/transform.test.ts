import { describe, expect, it, vi } from 'vitest'

import type { FragmentRegistry } from '#src/utils/graphql/registry'

import { findGraphqlLiterals } from '#src/utils/graphql/literals'
import { scanDefinitions } from '#src/runtime/utils/graphql/scanner'
import { createGraphqlTransformPlugin } from '#src/utils/graphql/transform'

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
    files: new Set(['graphql/product.ts', 'graphql/reviews.ts', 'graphql/utils.ts']),
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

const context = { addWatchFile: vi.fn() }

const transform = (code: string, file = '/project/app/pages/product/[handle].vue') =>
  createGraphqlTransformPlugin({ resolveRegistry: () => registry() }).transform.call(context, code, file)?.code

const definitions = (code: string) => {
  const literal = findGraphqlLiterals(code).at(0)!

  return scanDefinitions(literal.content).map(definition => `${definition.kind}:${definition.name ?? '<anonymous>'}`)
}

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

  it('injects into an anonymous operation', () => {
    const code = 'const q = `#graphql\n  query {\n    product { ...ProductFields }\n  }\n`'

    expect(transform(code)).toContain('fragment ProductFields')
  })

  it('injects into every operation literal in a file', () => {
    const code = 'const a = `#graphql\n query A { product { ...ProductFields } }\n`\nconst b = `#graphql\n query B { shop { ...ImageFields } }\n`'
    const result = transform(code)!

    expect(result.match(/fragment ProductFields/g)).toHaveLength(1)
    expect(result.match(/fragment ImageFields/g)).toHaveLength(2)
  })
})

describe('transform plugin', () => {
  const plugin = createGraphqlTransformPlugin({ resolveRegistry: () => registry() })

  const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n`'

  const run = (id: string) => plugin.transform.call(context, code, id)

  it('transforms a plain script module', () => {
    expect(run('/project/app/composables/product.ts')?.code).toContain('fragment ProductFields')
  })

  it('makes the files of the injected fragments, nested ones included, dependencies of the module', () => {
    const watched = { addWatchFile: vi.fn() }

    plugin.transform.call(watched, code, '/project/app/composables/product.ts')

    expect(watched.addWatchFile.mock.calls.flat().sort()).toStrictEqual(['graphql/product.ts', 'graphql/utils.ts'])
  })

  it('keeps a module that interpolates a fragment of its own from depending on every fragment file', () => {
    const watched = { addWatchFile: vi.fn() }
    const ownFragment = 'const CARD = `#graphql\n  fragment CardFields on Product { id }\n`\nconst q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields ...CardFields }\n  }\n  ${CARD}\n`'

    plugin.transform.call(watched, ownFragment, '/project/app/composables/product.ts')

    expect(watched.addWatchFile.mock.calls.flat().sort()).toStrictEqual(['graphql/product.ts', 'graphql/utils.ts'])
  })

  it('transforms a single file component', () => {
    expect(run('/project/app/pages/product.vue')?.code).toContain('fragment ProductFields')
  })

  it('transforms the script block of a single file component and resolves fragments by its file path', () => {
    const files: string[] = []

    const scriptPlugin = createGraphqlTransformPlugin({
      resolveRegistry: (file) => {
        files.push(file)

        return registry()
      },
    })

    const result = scriptPlugin.transform.call(context, code, '/project/app/pages/product.vue?vue&type=script&setup=true&lang.tsx')

    expect(result?.code).toContain('fragment ProductFields')
    expect(files).toStrictEqual(['/project/app/pages/product.vue'])
  })

  it('emits a source map for the original file', () => {
    const result = run('/project/app/composables/product.ts')!

    expect(result.map?.sources).toStrictEqual(['/project/app/composables/product.ts'])
    expect(result.map?.sourcesContent).toStrictEqual([code])
  })
})
