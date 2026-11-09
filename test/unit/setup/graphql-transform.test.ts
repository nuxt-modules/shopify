import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const addVitePlugin = vi.fn()

const scans = vi.hoisted(() => ({ count: 0, gates: [] as Promise<void>[] }))

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<typeof import('@nuxt/kit')>(),
  addVitePlugin,
}))

vi.mock('#src/utils/graphql/registry', async (importOriginal) => {
  const registry = await importOriginal<typeof import('#src/utils/graphql/registry')>()

  return {
    ...registry,
    scanFragments: async (...args: Parameters<typeof registry.scanFragments>) => {
      const registries = await registry.scanFragments(...args)

      scans.count++

      await scans.gates.shift()

      return registries
    },
  }
})

const { default: setupGraphqlTransform } = await import('#src/setup/graphql-transform')
const { useLogger } = await import('#src/utils/log')

const FRAGMENT = 'export const SHOP_FIELDS = `#graphql\n  fragment ShopFields on Shop { name }\n`\n'

const QUERY = 'export const query = `#graphql\n  query Shop { shop { ...ShopFields } }\n`\n'

let rootDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'nuxt-shopify-transform-'))
  addVitePlugin.mockClear()
  scans.gates.length = 0
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

async function setup(documents = ['**/*.ts']) {
  await mkdir(join(rootDir, 'graphql'), { recursive: true })
  await writeFile(join(rootDir, 'graphql/shop.ts'), FRAGMENT)

  await setupGraphqlTransform({ options: { rootDir, srcDir: join(rootDir, 'app') }, hook: vi.fn() } as never, {
    graphql: { injectFragments: true },
    fragments: { dirs: ['graphql'] },
    clients: { storefront: { documents } },
  } as never)

  const [plugin] = addVitePlugin.mock.calls[0]!

  const addWatchFile = vi.fn()

  return {
    plugin,
    addWatchFile,
    transform: (file: string) => plugin.transform.call({ addWatchFile }, QUERY, join(rootDir, file)) as { code: string } | undefined,
  }
}

async function injectsFragments(documents: string[], files: string[]) {
  const { transform } = await setup(documents)

  return Object.fromEntries(files.map(file => [file, !!transform(file)]))
}

describe('fragment injection', () => {
  it('injects fragments only into files the client\'s documents keep, reading ! entries as codegen does', async () => {
    expect(await injectsFragments(['**/*.ts', '!app/legacy', '!legacy'], [
      'app/pages/shop.ts',
      'app/legacy/shop.ts',
      'legacy/shop.ts',
      'app/pages/legacy/shop.ts',
    ])).toStrictEqual({
      'app/pages/shop.ts': true,
      'app/legacy/shop.ts': false,
      'legacy/shop.ts': false,
      'app/pages/legacy/shop.ts': true,
    })
  })
})

describe('fragment changes in development', () => {
  it('makes the file of each injected fragment a dependency of the module, so Vite and Nitro transform it again when the fragment changes', async () => {
    const { addWatchFile, transform } = await setup()

    transform('app/pages/shop.ts')

    expect(addWatchFile).toHaveBeenCalledExactlyOnceWith(join(rootDir, 'graphql/shop.ts'))
  })

  it('reads a changed fragment once before the modules are transformed again, however many servers report the change', async () => {
    const debug = vi.spyOn(useLogger(), 'debug')

    const { plugin, transform } = await setup()

    await writeFile(join(rootDir, 'graphql/shop.ts'), FRAGMENT.replace('{ name }', '{ name id }'))

    await Promise.all([
      plugin.watchChange(join(rootDir, 'graphql/shop.ts')),
      plugin.watchChange(join(rootDir, 'graphql/shop.ts')),
    ])

    const indexed = debug.mock.calls.filter(([message]) => String(message).startsWith('Indexed fragments'))

    debug.mockRestore()

    expect(indexed).toHaveLength(2)
    expect(transform('app/pages/shop.ts')?.code).toContain('fragment ShopFields on Shop { name id }')
  })

  it('reads a fragment again that changes while the previous change is being read', async () => {
    const { plugin, transform } = await setup()

    const scanned = scans.count
    let release!: () => void

    scans.gates.push(new Promise((resolve) => {
      release = resolve
    }))

    await writeFile(join(rootDir, 'graphql/shop.ts'), FRAGMENT.replace('{ name }', '{ name id }'))

    const first = plugin.watchChange(join(rootDir, 'graphql/shop.ts'))

    await vi.waitFor(() => expect(scans.count).toBe(scanned + 1))

    await writeFile(join(rootDir, 'graphql/shop.ts'), FRAGMENT.replace('{ name }', '{ name id description }'))

    const second = plugin.watchChange(join(rootDir, 'graphql/shop.ts'))

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(scans.count).toBe(scanned + 1)

    release()

    await Promise.all([first, second])

    expect(transform('app/pages/shop.ts')?.code).toContain('fragment ShopFields on Shop { name id description }')
  })

  it('makes every file in the fragment folders a dependency of a module that spreads a fragment none of them defines yet', async () => {
    await mkdir(join(rootDir, 'graphql'), { recursive: true })
    await writeFile(join(rootDir, 'graphql/reviews.ts'), 'export const reviews = []\n')

    const { plugin, addWatchFile } = await setup()

    const query = 'export const query = `#graphql\n  query Shop { shop { ...ShopFields ...ReviewFields } }\n`\n'
    const page = join(rootDir, 'app/pages/shop.ts')

    plugin.transform.call({ addWatchFile }, query, page)

    expect(addWatchFile.mock.calls.flat().sort()).toStrictEqual([join(rootDir, 'graphql/reviews.ts'), join(rootDir, 'graphql/shop.ts')])

    await writeFile(join(rootDir, 'graphql/reviews.ts'), 'export const REVIEW_FIELDS = `#graphql\n  fragment ReviewFields on Shop { id }\n`\n')
    await plugin.watchChange(join(rootDir, 'graphql/reviews.ts'))

    expect(plugin.transform.call({ addWatchFile }, query, page)?.code).toContain('fragment ReviewFields on Shop { id }')
  })
})
