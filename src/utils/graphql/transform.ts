import type { FragmentRegistry } from './registry'

import MagicString from 'magic-string'

import { collectSpreads, scanDefinitions } from '../../runtime/utils/graphql/scanner'
import { GRAPHQL_MARKER, findGraphqlLiterals } from './literals'
import { resolveFragments } from './registry'

const TRANSFORMABLE = /\.(?:ts|js|mjs|cjs|mts|cts|vue)(?:\?|$)/
const INTERPOLATION = /\$\{\s*(\w+)\s*\}/g

interface Insertion {
  at: number
  text: string
}

export interface GraphqlTransformOptions {
  resolveRegistry: (file: string) => FragmentRegistry | undefined
}

function collectFragmentInsertions(code: string, file: string, options: GraphqlTransformOptions) {
  const registry = options.resolveRegistry(file)

  const insertions: Insertion[] = []

  if (!registry) return insertions

  for (const literal of findGraphqlLiterals(code)) {
    const definitions = scanDefinitions(literal.content)
    const definesOperation = definitions.some(definition => definition.kind === 'operation')

    if (!definesOperation) continue

    const alreadyDefined = new Set<string>()
    const spreads = new Set<string>()

    for (const definition of definitions) {
      if (definition.kind === 'fragment' && definition.name) alreadyDefined.add(definition.name)

      for (const name of collectSpreads(definition.text)) spreads.add(name)
    }

    for (const [, binding] of literal.content.matchAll(INTERPOLATION)) {
      for (const name of registry.provides.get(binding!) ?? []) alreadyDefined.add(name)
    }

    const missing = resolveFragments(spreads, registry, alreadyDefined)

    if (!missing.length) continue

    insertions.push({
      at: literal.end,
      text: `\n${missing.map(fragment => fragment.text).join('\n')}\n`,
    })
  }

  return insertions
}

function rewrite(code: string, file: string, options: GraphqlTransformOptions) {
  const insertions = collectFragmentInsertions(code, file, options)

  if (!insertions.length) return

  const source = new MagicString(code)

  for (const insertion of insertions) source.appendLeft(insertion.at, insertion.text)

  return source
}

export function transformGraphqlLiterals(code: string, file: string, options: GraphqlTransformOptions) {
  return rewrite(code, file, options)?.toString()
}

export function createGraphqlTransformPlugin(options: GraphqlTransformOptions) {
  return {
    name: 'nuxt-shopify:graphql',
    enforce: 'post' as const,

    transform(code: string, id: string) {
      if (!TRANSFORMABLE.test(id) || !GRAPHQL_MARKER.test(code)) return

      const file = id.split('?')[0]!
      const transformed = rewrite(code, file, options)

      if (!transformed) return

      return {
        code: transformed.toString(),
        map: transformed.generateMap({ source: file, includeContent: true, hires: true }),
      }
    },
  }
}
