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
  addTypeTemplate: (template: unknown, context?: unknown) => addTypeTemplate(template, context),
  getLayerDirectories: () => layerDirectories,
  updateTemplates: (...args: unknown[]) => updateTemplates(...args),
}))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub() }))

const { default: setupCodegen } = await import('#src/setup/codegen')

let rootDir: string
let watch: (event: string, file: string) => Promise<unknown>

function createNuxt(options: Record<string, unknown> = {}) {
  const hooks: Record<string, (...args: never[]) => unknown> = {}

  return {
    options: { dev: false, _prepare: false, rootDir, srcDir: join(rootDir, 'app'), buildDir: join(rootDir, '.nuxt'), alias: {}, nitro: {}, watch: [] as string[], ...options },
    hook: vi.fn((name: string, hook: (...args: never[]) => unknown) => {
      hooks[name] = hook

      if (name === 'builder:watch') watch = hook as typeof watch
    }),
    hooks,
  }
}

function shop(clients: Record<string, Record<string, unknown>>) {
  return {
    name: 'shop',
    clients: Object.fromEntries(Object.entries(clients).map(([clientType, client]) => [clientType, { apiVersion: API_VERSION, documents: [], codegen: { globalTypes: false }, ...client }])),
  } as never
}

async function project(files: Record<string, string>, documents = ['app/**/*.{ts,vue,graphql}']) {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(rootDir, name, '..'), { recursive: true })
    await writeFile(join(rootDir, name), content)
  }

  const nuxt = createNuxt({ dev: true })

  setupCodegen(nuxt as never, shop({ storefront: { documents } }))

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

    setupCodegen(nuxt as never, shop({ storefront: { documents: ['**/*.ts'] } }))

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

  it.each([
    ['the last operation is removed from a file it saw with GraphQL', 'change', (file: string) => writeFile(file, 'const query = undefined')],
    ['a file with operations is deleted', 'unlink', (file: string) => rm(file)],
  ])('regenerates when %s', async (_, event, edit) => {
    await project({ 'app/pages/index.vue': 'const query = `#graphql\n  query Shop { shop { name } }\n`' })

    await watch('change', join(rootDir, 'app/pages/index.vue'))

    await edit(join(rootDir, 'app/pages/index.vue'))

    await watch(event, join(rootDir, 'app/pages/index.vue'))

    expect(updateTemplates).toHaveBeenCalledTimes(2)
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

    setupCodegen(createNuxt() as never, shop({ [clientType]: {} }))

    expect(addTypeTemplate).toHaveBeenCalledTimes(3)

    for (const [, called] of addTypeTemplate.mock.calls) expect(called).toStrictEqual({ nuxt: true, nitro: true, node: true })
  })
})

describe('setupCodegen', () => {
  it('fails a production build when the types of a client fail to generate', async () => {
    addTypeTemplate.mockClear()

    const nuxt = createNuxt()

    setupCodegen(nuxt as never, shop({ admin: {} }))

    const [[types]] = addTypeTemplate.mock.calls as unknown as [[{ getContents: () => Promise<string> }]]

    await types.getContents()

    expect(() => nuxt.hooks['build:before']!()).toThrow(/Type generation failed:\n {2}- Failed to generate `shopify\/schema\/admin\..+\.schema\.json`: .*missing `clientId` or `clientSecret`/)
  })

  it('builds when every client\'s types generate', () => {
    const nuxt = createNuxt()

    setupCodegen(nuxt as never, shop({}))

    expect(() => nuxt.hooks['build:before']!()).not.toThrow()
  })

  it.each(['dev', '_prepare', 'test'])('leaves %s runs alone, as @nuxt/test-utils builds the app before every test run', (mode) => {
    const nuxt = createNuxt({ [mode]: true })

    setupCodegen(nuxt as never, shop({}))

    expect(nuxt.hook).not.toHaveBeenCalled()
  })
})
