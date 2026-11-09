import type { GraphqlDefinition } from '../../runtime/utils/graphql/scanner'

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { normalize, relative } from 'pathe'

import { IGNORED_DIRS } from '../../runtime/utils/config'
import { collectSpreads, scanDefinitions } from '../../runtime/utils/graphql/scanner'
import { useLogger } from '../log'
import { INTERPOLATION, SCHEMA_LANGUAGE_FILE, findGraphqlLiterals } from './literals'

const SCANNABLE = /\.(?:ts|js|mjs|cjs|mts|cts|vue|gql|graphql)$/

export type FragmentEntry = {
  name: string
  text: string
  spreads: string[]
  file: string
}

export type FragmentRegistry = {
  files: Set<string>
  fragments: Map<string, FragmentEntry>
  provides: Map<string, Set<string>>
}

type BindingLink = {
  registry: FragmentRegistry
  binding: string
  interpolations: Set<string>
}

export function within(dirs: string[], path: string) {
  const file = normalize(path)

  return dirs.some((dir) => {
    const base = normalize(dir).replace(/\/+$/, '')

    return file === base || file.startsWith(`${base}/`)
  })
}

function createRegistry(): FragmentRegistry {
  return { files: new Set(), fragments: new Map(), provides: new Map() }
}

const hasUnresolvedInterpolation = (text: string) => /(?<!\\)\$\{/.test(text)

const escapeTemplateLiteral = (text: string) => text.replace(/\\|`|\$\{/g, match => `\\${match}`)

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => [])

  return entries
    .filter(entry => entry.isFile() && SCANNABLE.test(entry.name))
    .filter(entry => !relative(dir, entry.parentPath).split('/').some(part => IGNORED_DIRS.includes(part)))
    .map(entry => join(entry.parentPath, entry.name))
}

function readDefinitions(file: string, code: string) {
  if (SCHEMA_LANGUAGE_FILE.test(file)) {
    const definitions = scanDefinitions(code).map(definition => ({ ...definition, text: escapeTemplateLiteral(definition.text) }))

    return [{ definitions, interpolations: new Set<string>(), binding: undefined }]
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

type FragmentCollision = {
  name: string
  kept: string
  ignored: string
}

function warnCollisions(collisions: FragmentCollision[]) {
  if (!collisions.length) return

  const logger = useLogger()

  for (const { name, kept, ignored } of collisions) {
    logger.warn(
      `Fragment \`${name}\` is defined in more than one file. `
      + `Using \`${relative(process.cwd(), kept)}\`, ignoring \`${relative(process.cwd(), ignored)}\``,
    )
  }
}

export async function scanFragments(
  dirs: string[],
  routeFile: (file: string) => string | undefined,
): Promise<Map<string, FragmentRegistry>> {
  const registries = new Map<string, FragmentRegistry>()
  const links = new Map<string, BindingLink>()
  const collisions: FragmentCollision[] = []

  for (const dir of dirs) {
    for (const file of await listFiles(dir)) {
      const client = routeFile(file)

      if (!client) continue

      let registry = registries.get(client)

      if (!registry) registries.set(client, registry = createRegistry())

      registry.files.add(file)

      const code = await readFile(file, 'utf8').catch(() => '')

      if (!code || !code.includes('fragment')) continue

      for (const { definitions, interpolations, binding } of readDefinitions(file, code)) {
        const fragments = definitions.filter((definition): definition is GraphqlDefinition & { name: string } =>
          definition.kind === 'fragment' && !!definition.name)

        if (!fragments.length) continue

        const provided = new Set<string>()

        for (const fragment of fragments) {
          if (hasUnresolvedInterpolation(fragment.text)) continue

          provided.add(fragment.name)

          const existing = registry.fragments.get(fragment.name)

          if (!existing) {
            registry.fragments.set(fragment.name, {
              name: fragment.name,
              text: fragment.text,
              spreads: [...collectSpreads(fragment.text)],
              file,
            })
          }
          else if (existing.file !== file) {
            collisions.push({ name: fragment.name, kept: existing.file, ignored: file })
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

  warnCollisions(collisions)

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
