import type { FragmentRegistry } from './registry'

import { collectSpreads, scanDefinitions } from '../../runtime/utils/graphql/scanner'
import { findGraphqlLiterals } from './literals'
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

function applyInsertions(source: string, insertions: Insertion[]) {
  let result = source

  for (const insertion of [...insertions].sort((left, right) => right.at - left.at)) {
    result = result.slice(0, insertion.at) + insertion.text + result.slice(insertion.at)
  }

  return result
}

export function transformGraphqlLiterals(code: string, file: string, options: GraphqlTransformOptions) {
  const registry = options.resolveRegistry(file)

  if (!registry) return

  const insertions: Insertion[] = []

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

  if (!insertions.length) return

  return applyInsertions(code, insertions)
}

export function createGraphqlTransformPlugin(options: GraphqlTransformOptions) {
  return {
    name: 'nuxt-shopify:graphql',
    enforce: 'pre' as const,

    transform(code: string, id: string) {
      if (!TRANSFORMABLE.test(id) || !code.includes('#graphql')) return

      const file = id.split('?')[0]!
      const transformed = transformGraphqlLiterals(code, file, options)

      if (!transformed) return

      return { code: transformed, map: null }
    },
  }
}
