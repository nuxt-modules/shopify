import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FragmentRegistry } from '#src/utils/graphql/registry'

import { findGraphqlLiterals } from '#src/utils/graphql/literals'
import { createGraphqlTransformPlugin } from '#src/utils/graphql/transform'
import { IMAGE, PRICE, PRODUCT, names } from '#test/helpers/graphql'
import { createLoggerStub } from '#test/helpers/logger'

const warnings: string[] = []

vi.mock('#src/utils/log', () => ({
  useLogger: () => createLoggerStub({ warn: (message: string) => void warnings.push(message) }),
}))

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

const transform = (code: string, file = '/project/app/pages/product/[handle].vue', fragments = registry()) =>
  createGraphqlTransformPlugin({ resolveRegistry: () => fragments }).transform.call(context, code, file)?.code

beforeEach(() => {
  warnings.length = 0
})

describe('fragment injection', () => {
  it('gathers all fragments that another fragment or operation uses', () => {
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n`'

    expect(names(findGraphqlLiterals(transform(code)!).at(0)!.content)).toStrictEqual([
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

  it('injects the fragments that an interpolated fragment spreads but does not interpolate itself', () => {
    const fragments = registry()

    fragments.provides.set('PRODUCT_FRAGMENT', new Set(['ProductFields']))

    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n  ${PRODUCT_FRAGMENT}\n`'
    const result = transform(code, '/project/app/pages/product.vue', fragments)!

    expect(result).toContain('fragment ImageFields')
    expect(result).toContain('fragment PriceFields')
    expect(result.match(/fragment ProductFields/g)).toBeNull()
  })

  it('leaves fragment-only literals alone so they stay defined', () => {
    const code = 'export const PRODUCT_FRAGMENT = `#graphql\n  fragment ProductFields on Product {\n    ...ImageFields\n  }\n`'

    expect(transform(code, '/project/graphql/fragments/product.ts')).toBeUndefined()
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

describe('fragments it cannot inject', () => {
  const page = join(process.cwd(), 'app/pages/product.vue')

  const withReviews = () => {
    const fragments = registry()

    fragments.fragments.set('ReviewFields', { name: 'ReviewFields', text: 'fragment ReviewFields on Product {\n  ...CardFields\n}', spreads: ['CardFields'], file: 'graphql/reviews.ts' })
    fragments.provides.set('REVIEW_FRAGMENT', new Set(['ReviewFields']))

    return fragments
  }

  it('leaves a fragment out that nothing defines, and warns once that the request will fail, however often the module is transformed', () => {
    const plugin = createGraphqlTransformPlugin({ resolveRegistry: () => registry() })
    const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...UnknownFields }\n  }\n`'

    expect(plugin.transform.call(context, code, page)).toBeUndefined()
    expect(plugin.transform.call(context, code, `${page}?vue&type=script&setup=true&lang.ts`)).toBeUndefined()

    expect(warnings).toStrictEqual([
      'Fragment `UnknownFields` is used in `app/pages/product.vue` but isn\'t defined in the operation or in `fragments.dirs`, so the request will fail. '
      + 'Define it in the operation, add it with string interpolation, or move it into `fragments.dirs`',
    ])
  })

  it('warns about a fragment that an injected fragment spreads', () => {
    transform('const q = `#graphql\n  query FetchProduct {\n    product { ...ReviewFields }\n  }\n`', page, withReviews())

    expect(warnings).toStrictEqual([expect.stringMatching(/^Fragment `CardFields` is used in `app\/pages\/product\.vue` /)])
  })

  it('does not warn about fragments it injects or the operation defines', () => {
    transform('const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields ...CardFields }\n  }\n  fragment CardFields on Product { id }\n`', page)

    expect(warnings).toStrictEqual([])
  })

  it.each([
    ['a constant it does not know', '...CardFields', '${CARD_FRAGMENT}'],
    ['an expression', '...CardFields', '${fragments.card}'],
    ['a fragment constant, which may also define the fragments its fragment spreads', '...ReviewFields', '${REVIEW_FRAGMENT}'],
  ])('does not warn when the operation interpolates %s', (_, spread, interpolation) => {
    transform(`const q = \`#graphql\n  query FetchProduct {\n    product { ${spread} }\n  }\n  ${interpolation}\n\``, page, withReviews())

    expect(warnings).toStrictEqual([])
  })
})

describe('transform plugin', () => {
  const plugin = createGraphqlTransformPlugin({ resolveRegistry: () => registry() })

  const code = 'const q = `#graphql\n  query FetchProduct {\n    product { ...ProductFields }\n  }\n`'

  const run = (id: string) => plugin.transform.call(context, code, id)

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
