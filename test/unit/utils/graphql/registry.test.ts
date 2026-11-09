import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'

const warnings: string[] = []
const fragmentDirs: string[] = []

vi.mock('#src/utils/log', () => ({
  initLogger: () => undefined,
  useLogger: () => createLoggerStub({ warn: (message: string) => void warnings.push(message) }),
}))

const { scanFragments, within } = await import('#src/utils/graphql/registry')

const toStorefront = () => 'storefront'

async function createFragmentDir(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), 'nuxt-shopify-fragments-'))

  fragmentDirs.push(dir)

  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)

    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, content, 'utf8')
  }

  return dir
}

beforeEach(() => {
  warnings.length = 0
})

afterEach(async () => {
  await Promise.all(fragmentDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('duplicate fragment names', () => {
  it('warns and names both files when one fragment is defined twice', async () => {
    const dir = await createFragmentDir({
      'product.ts': 'export const product = `#graphql\n  fragment ProductCard on Product { id }\n`',
      'legacy.ts': 'export const legacy = `#graphql\n  fragment ProductCard on Product { handle }\n`',
    })

    const registries = await scanFragments([dir], toStorefront)

    expect(registries.get('storefront')?.fragments.size).toBe(1)

    const message = warnings.join('\n')

    expect(message).toContain('`ProductCard`')
    expect(message).toContain('product.ts')
    expect(message).toContain('legacy.ts')
  })

  it('stays quiet when overlapping fragment directories scan the same file twice', async () => {
    const dir = await createFragmentDir({
      'fragments/product.ts': 'export const product = `#graphql\n  fragment ProductCard on Product { id }\n  fragment ProductPrice on Product { handle }\n`',
    })

    const registries = await scanFragments([dir, join(dir, 'fragments')], toStorefront)

    expect(registries.get('storefront')?.fragments.size).toBe(2)
    expect(warnings).toHaveLength(0)
  })

  it('keeps distinct names in different files apart', async () => {
    const dir = await createFragmentDir({
      'product.ts': 'export const product = `#graphql\n  fragment ProductCard on Product { id }\n`',
      'collection.ts': 'export const collection = `#graphql\n  fragment CollectionCard on Collection { id }\n`',
    })

    const registries = await scanFragments([dir], toStorefront)

    expect(registries.get('storefront')?.fragments.size).toBe(2)
    expect(warnings).toHaveLength(0)
  })
})

describe('fragments from schema language files', () => {
  it('stores them ready to be pasted into a template literal', async () => {
    const graphql = 'fragment ProductCard on Product {\n  # the `handle` drives the route, not C:\\shop or ${price}\n  handle\n}'

    const dir = await createFragmentDir({ 'product.graphql': graphql })

    const fragment = (await scanFragments([dir], toStorefront)).get('storefront')?.fragments.get('ProductCard')

    expect(fragment).toBeDefined()

    const pasted = new Function(`return \`${fragment!.text}\``)() as string

    expect(pasted).toBe(graphql)
  })
})

describe('fragment directories', () => {
  const dirs = [join('/project', 'graphql')]

  it('matches a file inside a fragment directory', () => {
    expect(within(dirs, join('/project', 'graphql', 'fragments', 'product.ts'))).toBe(true)
  })

  it('ignores files outside the fragment directories', () => {
    expect(within(dirs, join('/project', 'app', 'components', 'Product.vue'))).toBe(false)
  })

  it('does not match a sibling directory sharing the prefix', () => {
    expect(within(dirs, join('/project', 'graphql-extra', 'product.ts'))).toBe(false)
  })

  it('matches a fragment directory configured with a trailing slash', () => {
    expect(within([join('/project', 'graphql/')], join('/project', 'graphql', 'product.ts'))).toBe(true)
  })

  it('matches Windows paths in either separator style, as Vite reports forward slashes and Nitro native ones', () => {
    const windowsDirs = ['C:\\project\\graphql']

    expect(within(windowsDirs, 'C:/project/graphql/fragments/product.ts')).toBe(true)
    expect(within(windowsDirs, 'C:\\project\\graphql\\fragments\\product.ts')).toBe(true)
    expect(within(windowsDirs, 'C:/project/graphql-extra/product.ts')).toBe(false)
  })
})
