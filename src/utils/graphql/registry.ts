import type { GraphqlDefinition } from '../../runtime/utils/graphql/scanner'

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { collectSpreads, scanDefinitions } from '../../runtime/utils/graphql/scanner'
import { findGraphqlLiterals } from './literals'

const SCANNABLE = /\.(?:ts|js|mjs|cjs|mts|cts|vue|gql|graphql)$/
const SCHEMA_LANGUAGE = /\.(?:gql|graphql)$/
const INTERPOLATION = /\$\{\s*(\w+)\s*\}/g

const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.nuxt', '.output', '.git', '.vercel'])

export interface FragmentEntry {
  name: string
  text: string
  spreads: string[]
  file: string
}

export interface FragmentRegistry {
  fragments: Map<string, FragmentEntry>
  provides: Map<string, Set<string>>
}

interface BindingLink {
  registry: FragmentRegistry
  binding: string
  interpolations: Set<string>
}

function createRegistry(): FragmentRegistry {
  return { fragments: new Map(), provides: new Map() }
}

const toPosix = (path: string) => path.split(sep).join('/')

const hasUnresolvedInterpolation = (text: string) => text.includes('${')

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => [])

  return entries
    .filter(entry => entry.isFile() && SCANNABLE.test(entry.name))
    .filter(entry => !toPosix(relative(dir, entry.parentPath)).split('/').some(part => SKIPPED_DIRS.has(part)))
    .map(entry => join(entry.parentPath, entry.name))
}

function readDefinitions(file: string, code: string) {
  if (SCHEMA_LANGUAGE.test(file)) {
    return [{ definitions: scanDefinitions(code), interpolations: new Set<string>(), binding: undefined }]
  }

  return findGraphqlLiterals(code).map(literal => ({
    definitions: scanDefinitions(literal.content),
    interpolations: new Set([...literal.content.matchAll(INTERPOLATION)].map(match => match[1]!)),
    binding: literal.binding,
  }))
}

function expandProvidesThroughInterpolations(links: Map<string, BindingLink>) {
  for (const { registry, binding, interpolations } of links.values()) {
    const provided = registry.provides.get(binding)

    if (!provided) continue

    const pending = [...interpolations]
    const seen = new Set<string>([binding])

    while (pending.length) {
      const next = pending.pop()!

      if (seen.has(next)) continue

      seen.add(next)

      for (const name of registry.provides.get(next) ?? []) provided.add(name)

      const nested = links.get(next)

      if (nested) pending.push(...nested.interpolations)
    }
  }
}

export async function scanFragments(
  dirs: string[],
  routeFile: (file: string) => string | undefined,
): Promise<Map<string, FragmentRegistry>> {
  const registries = new Map<string, FragmentRegistry>()
  const links = new Map<string, BindingLink>()

  for (const dir of dirs) {
    for (const file of await listFiles(dir)) {
      const client = routeFile(file)

      if (!client) continue

      const code = await readFile(file, 'utf8').catch(() => '')

      if (!code || !code.includes('fragment')) continue

      let registry = registries.get(client)

      if (!registry) registries.set(client, registry = createRegistry())

      for (const { definitions, interpolations, binding } of readDefinitions(file, code)) {
        const fragments = definitions.filter((definition): definition is GraphqlDefinition & { name: string } =>
          definition.kind === 'fragment' && !!definition.name)

        if (!fragments.length) continue

        const provided = new Set<string>()

        for (const fragment of fragments) {
          if (hasUnresolvedInterpolation(fragment.text)) continue

          provided.add(fragment.name)

          if (!registry.fragments.has(fragment.name)) {
            registry.fragments.set(fragment.name, {
              name: fragment.name,
              text: fragment.text,
              spreads: [...collectSpreads(fragment.text)],
              file,
            })
          }
        }

        if (binding) {
          registry.provides.set(binding, provided)

          if (interpolations.size) links.set(binding, { registry, binding, interpolations })
        }
      }
    }
  }

  expandProvidesThroughInterpolations(links)

  return registries
}

export function resolveFragments(
  spreads: Iterable<string>,
  registry: FragmentRegistry,
  present: Set<string>,
): FragmentEntry[] {
  const resolved: FragmentEntry[] = []
  const seen = new Set<string>(present)
  const pending = [...spreads]

  while (pending.length) {
    const name = pending.pop()!

    if (seen.has(name)) continue

    seen.add(name)

    const fragment = registry.fragments.get(name)

    if (!fragment) continue

    resolved.push(fragment)
    pending.push(...fragment.spreads)
  }

  return resolved.sort((left, right) => left.name.localeCompare(right.name))
}
