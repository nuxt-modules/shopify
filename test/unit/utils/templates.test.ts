import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { API_VERSION } from '#test/helpers/api-version'

const updateTemplates = vi.fn()
const addTypeTemplate = vi.fn((template: unknown, _context?: unknown) => template)

vi.mock('@nuxt/kit', () => ({
  addTemplate: (template: unknown) => template,
  addTypeTemplate: (template: unknown, context?: unknown) => addTypeTemplate(template, context),
  updateTemplates: (...args: unknown[]) => updateTemplates(...args),
}))

const { registerTemplates } = await import('#src/utils/templates')

let rootDir: string
let watch: (event: string, file: string) => Promise<unknown>

async function project(files: Record<string, string>) {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(rootDir, name, '..'), { recursive: true })
    await writeFile(join(rootDir, name), content)
  }

  const nuxt = {
    options: { rootDir, srcDir: join(rootDir, 'app'), buildDir: join(rootDir, '.nuxt'), alias: {}, nitro: {} },
    hook: (name: string, hook: typeof watch) => {
      if (name === 'builder:watch') watch = hook
    },
  }

  registerTemplates(nuxt as never, {
    name: 'shop',
    clients: { storefront: { apiVersion: API_VERSION, documents: ['app/**/*.{ts,vue,graphql}'] } },
  } as never, ShopifyClientType.Storefront)
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), '.shopify-watcher-'))
  updateTemplates.mockClear()
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('regenerating operation types in development', () => {
  it.each([
    ['a #graphql literal', 'app/pages/index.vue', 'const query = `#graphql\n  query Shop { shop { name } }\n`'],
    ['a gql tagged template', 'app/composables/shop.ts', 'export const query = gql`query Shop { shop { name } }`'],
    ['a schema language file', 'app/graphql/shop.graphql', 'query Shop { shop { name } }'],
  ])('regenerates when %s changes, inside a project under a dot directory', async (_, file, content) => {
    await project({ [file]: content })

    await watch('change', join(rootDir, file))

    expect(updateTemplates).toHaveBeenCalledOnce()
  })

  it('stays quiet for a file without GraphQL', async () => {
    await project({ 'app/utils/math.ts': 'export const add = (a: number, b: number) => a + b' })

    await watch('change', join(rootDir, 'app/utils/math.ts'))

    expect(updateTemplates).not.toHaveBeenCalled()
  })

  it('stays quiet for a GraphQL file outside the configured documents', async () => {
    await project({ 'server/api/shop.ts': 'export const query = `#graphql\n  query Shop { shop { name } }\n`' })

    await watch('change', join(rootDir, 'server/api/shop.ts'))

    expect(updateTemplates).not.toHaveBeenCalled()
  })
})

describe('type references', () => {
  it.each(Object.values(ShopifyClientType))('references the %s types in the app, Nitro and node tsconfigs, as typed server routes carry even admin results into the app', (clientType) => {
    addTypeTemplate.mockClear()

    const nuxt = {
      options: { rootDir, srcDir: join(rootDir, 'app'), buildDir: join(rootDir, '.nuxt'), alias: {}, nitro: {} },
      hook: vi.fn(),
    }

    registerTemplates(nuxt as never, { name: 'shop', clients: { [clientType]: { apiVersion: API_VERSION, documents: [] } } } as never, clientType)

    expect(addTypeTemplate).toHaveBeenCalledTimes(3)

    for (const [, called] of addTypeTemplate.mock.calls) expect(called).toStrictEqual({ nuxt: true, nitro: true, node: true })
  })
})
