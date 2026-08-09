import type { GraphqlDefinition } from './scanner'

import { collectSpreads, scanDefinitions } from './scanner'

const CACHE_LIMIT = 256

const cache = new Map<string, string>()

function remember(source: string, result: string) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value

    if (oldest !== undefined) cache.delete(oldest)
  }

  cache.set(source, result)

  return result
}

function cut(source: string, spans: Pick<GraphqlDefinition, 'start' | 'end'>[]) {
  let result = ''
  let cursor = 0

  for (const span of spans) {
    result += source.slice(cursor, span.start)
    cursor = span.end
  }

  return result + source.slice(cursor)
}

function collectReachableFragmentNames(operations: GraphqlDefinition[], byName: Map<string, GraphqlDefinition>) {
  const reachable = new Set<string>()
  const pending = [...collectSpreads(operations.map(operation => operation.text).join('\n'))]

  while (pending.length) {
    const name = pending.pop()!

    if (reachable.has(name)) continue

    reachable.add(name)

    const fragment = byName.get(name)

    if (fragment) pending.push(...collectSpreads(fragment.text))
  }

  return reachable
}

export function normalizeOperation(source: string): string {
  if (typeof source !== 'string' || !source.includes('fragment')) return source

  const cached = cache.get(source)

  if (cached !== undefined) return cached

  const definitions = scanDefinitions(source)

  const fragments = definitions.filter(definition => definition.kind === 'fragment')
  const operations = definitions.filter(definition => definition.kind === 'operation')

  if (!fragments.length || !operations.length) return remember(source, source)

  const byName = new Map<string, GraphqlDefinition>()
  const removable: GraphqlDefinition[] = []

  for (const fragment of fragments) {
    const isDuplicate = byName.has(fragment.name!)

    if (isDuplicate) removable.push(fragment)
    else byName.set(fragment.name!, fragment)
  }

  const reachable = collectReachableFragmentNames(operations, byName)

  for (const [name, fragment] of byName) {
    const isUnreachable = !reachable.has(name)

    if (isUnreachable) removable.push(fragment)
  }

  if (!removable.length) return remember(source, source)

  removable.sort((left, right) => left.start - right.start)

  return remember(source, cut(source, removable))
}
