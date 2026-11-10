import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { API_VERSION } from '#test/helpers/api-version'
import { createLoggerStub } from '#test/helpers/logger'

const updateTemplates = vi.fn()
const addTypeTemplate = vi.fn((template: unknown, _context?: unknown) => template)
const layerDirectories: Array<{ shared: string }> = []

vi.mock('@nuxt/kit', () => ({
  addTemplate: (template: unknown) => template,
  addTypeTemplate: (template: unknown, context?: unknown) => addTypeTemplate(template, context),
  getLayerDirectories: () => layerDirectories,
  updateTemplates: (...args: unknown[]) => updateTemplates(...args),
}))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub() }))

const generatorDocuments: Array<{ revision: number }> = []

vi.mock('#src/utils/codegen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#src/utils/codegen')>()

  return {
    ...actual,
    createOperationsGenerator: (...args: Parameters<typeof actual.createOperationsGenerator>) => {
      generatorDocuments.push(args[1]!)

      return actual.createOperationsGenerator(...args)
    },
  }
})

const { default: setupCodegen, registerTemplates } = await import('#src/setup/codegen')

let rootDir: string
let watch: (event: string, file: string) => Promise<unknown>

async function project(files: Record<string, string>, documents = ['app/**/*.{ts,vue,graphql}']) {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(rootDir, name, '..'), { recursive: true })
    await writeFile(join(rootDir, name), content)
  }

  const nuxt = {
    options: { rootDir, srcDir: join(rootDir, 'app'), buildDir: join(rootDir, '.nuxt'), alias: {}, nitro: {}, watch: [] as string[] },
    hook: (name: string, hook: typeof watch) => {
      if (name === 'builder:watch') watch = hook
    },
  }

  registerTemplates(nuxt as never, {
    name: 'shop',
    clients: { storefront: { apiVersion: API_VERSION, documents } },
  } as never, ShopifyClientType.Storefront)

  return nuxt
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), '.shopify-watcher-'))
  updateTemplates.mockClear()
  layerDirectories.length = 0
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

  it('watches the shared folder of every layer, which the Nuxt 4 watcher leaves out, so documents there regenerate the operation types', async () => {
    layerDirectories.push({ shared: `${join(rootDir, 'shared')}/` }, { shared: `${join(rootDir, 'layers/base/shared')}/` })

    const nuxt = await project({ 'shared/queries/shop.ts': 'export const query = `#graphql\n  query Shop { shop { name } }\n`' }, ['**/*.ts'])

    registerTemplates(nuxt as never, { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, documents: ['**/*.ts'] } } } as never, ShopifyClientType.Storefront)

    expect(nuxt.options.watch).toStrictEqual([`${join(rootDir, 'shared')}/`, `${join(rootDir, 'layers/base/shared')}/`])

    await watch('change', join(rootDir, 'shared/queries/shop.ts'))

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

  it('regenerates when the last operation is removed from a file it saw with GraphQL', async () => {
    await project({ 'app/pages/index.vue': 'const query = `#graphql\n  query Shop { shop { name } }\n`' })

    await watch('change', join(rootDir, 'app/pages/index.vue'))

    await writeFile(join(rootDir, 'app/pages/index.vue'), 'const query = undefined')

    await watch('change', join(rootDir, 'app/pages/index.vue'))

    expect(updateTemplates).toHaveBeenCalledTimes(2)
  })

  it('regenerates when a file with operations is deleted', async () => {
    await project({ 'app/pages/index.vue': 'const query = `#graphql\n  query Shop { shop { name } }\n`' })

    await watch('change', join(rootDir, 'app/pages/index.vue'))

    await rm(join(rootDir, 'app/pages/index.vue'))

    await watch('unlink', join(rootDir, 'app/pages/index.vue'))

    expect(updateTemplates).toHaveBeenCalledTimes(2)
  })

  it('moves the operations generator to a new revision on each change it regenerates for, so its cache expires', async () => {
    generatorDocuments.length = 0

    await project({ 'app/pages/index.vue': 'const query = `#graphql\n  query Shop { shop { name } }\n`' })

    await watch('change', join(rootDir, 'app/pages/index.vue'))

    expect(generatorDocuments.at(-1)?.revision).toBe(1)
  })

  it('stays quiet for a GraphQL file in a folder that a ! entry excludes', async () => {
    await project({ 'app/legacy/shop.ts': 'export const query = `#graphql\n  query Shop { shop { name } }\n`' }, ['app/**/*.ts', '!app/legacy'])

    await watch('change', join(rootDir, 'app/legacy/shop.ts'))

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

function createNuxt(options: Record<string, boolean>) {
  return { options: { dev: false, _prepare: false, ...options }, hook: vi.fn() }
}

describe('setupCodegen', () => {
  it('fails a production build on generate failures', () => {
    const nuxt = createNuxt({})

    setupCodegen(nuxt as never, { clients: {} } as never)

    expect(nuxt.hook).toHaveBeenCalledWith('build:before', expect.any(Function))
  })

  it.each(['dev', '_prepare', 'test'])('leaves %s runs alone, as @nuxt/test-utils builds the app before every test run', (mode) => {
    const nuxt = createNuxt({ [mode]: true })

    setupCodegen(nuxt as never, { clients: {} } as never)

    expect(nuxt.hook).not.toHaveBeenCalled()
  })
})
