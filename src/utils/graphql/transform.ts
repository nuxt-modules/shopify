import type { FragmentRegistry } from './registry'

import MagicString from 'magic-string'
import { relative } from 'pathe'

import { collectSpreads, scanDefinitions } from '../../runtime/utils/graphql/scanner'
import { useLogger } from '../log'
import { GRAPHQL_MARKER, INTERPOLATION, findGraphqlLiterals } from './literals'
import { resolveFragments } from './registry'

const TRANSFORMABLE = /\.(?:ts|js|mjs|cjs|mts|cts|vue)(?:\?|$)/

type Insertion = {
  at: number
  text: string
}

export type GraphqlTransformOptions = {
  resolveRegistry: (file: string) => FragmentRegistry | undefined
}

function collectFragmentInsertions(code: string, file: string, options: GraphqlTransformOptions) {
  const registry = options.resolveRegistry(file)

  const insertions: Insertion[] = []
  const dependencies = new Set<string>()
  const undefinedFragments = new Set<string>()

  if (!registry) return { insertions, dependencies, undefinedFragments }

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

    const bindings = [...literal.content.matchAll(INTERPOLATION)].map(([, binding]) => binding!)
    const interpolatedSpreads: string[] = []

    for (const binding of bindings) {
      for (const name of registry.provides.get(binding) ?? []) {
        alreadyDefined.add(name)
        interpolatedSpreads.push(...registry.fragments.get(name)?.spreads ?? [])
      }
    }

    const missing = resolveFragments([...spreads, ...interpolatedSpreads], registry, alreadyDefined)

    const knowsEveryInterpolation = bindings.length === literal.content.split('${').length - 1
      && bindings.every(binding => registry.provides.has(binding))

    const unresolved = knowsEveryInterpolation
      ? [...spreads, ...missing.flatMap(fragment => fragment.spreads)].filter(name => !alreadyDefined.has(name) && !registry.fragments.has(name))
      : []

    for (const name of unresolved) undefinedFragments.add(name)

    for (const dependency of unresolved.length ? registry.files : missing.map(fragment => fragment.file)) dependencies.add(dependency)

    if (!missing.length) continue

    insertions.push({
      at: literal.end,
      text: `\n${missing.map(fragment => fragment.text).join('\n')}\n`,
    })
  }

  return { insertions, dependencies, undefinedFragments }
}

export function createGraphqlTransformPlugin(options: GraphqlTransformOptions) {
  const warnings = new Set<string>()

  return {
    name: 'shopify:graphql',
    enforce: 'post' as const,

    transform(this: { addWatchFile: (id: string) => void }, code: string, id: string) {
      if (!TRANSFORMABLE.test(id) || !GRAPHQL_MARKER.test(code)) return

      const file = id.split('?')[0]!
      const { insertions, dependencies, undefinedFragments } = collectFragmentInsertions(code, file, options)

      for (const dependency of dependencies) this.addWatchFile(dependency)

      for (const name of undefinedFragments) {
        const warning = `Fragment \`${name}\` is used in \`${relative(process.cwd(), file)}\` but isn't defined in the operation or in \`fragments.dirs\`, so the request will fail. `
          + 'Define it in the operation, add it with string interpolation, or move it into `fragments.dirs`'

        if (warnings.has(warning)) continue

        warnings.add(warning)
        useLogger().warn(warning)
      }

      if (!insertions.length) return

      const source = new MagicString(code)

      for (const insertion of insertions) source.appendLeft(insertion.at, insertion.text)

      return {
        code: source.toString(),
        map: source.generateMap({ source: file, includeContent: true, hires: true }),
      }
    },
  }
}
