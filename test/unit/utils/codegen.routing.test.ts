import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSchema, introspectionFromSchema } from 'graphql'
import { kebabCase } from 'scule'
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest'

import { ShopifyClientType, configObjectSchema } from '#src/schemas'
import { createOperationsGenerator, createTypesGenerator, getGenerateFailures } from '#src/utils/codegen'
import { API_VERSION } from '#test/helpers/api-version'

const HYDROGEN_STOREFRONT_SCHEMA = fileURLToPath(import.meta.resolve('@shopify/hydrogen/storefront.schema.json'))

const ADMIN_SDL = `
  type Query {
    customers(first: Int): CustomerConnection!
  }

  type CustomerConnection {
    nodes: [Customer!]!
  }

  type Customer {
    id: ID!
  }
`

const CODEGEN_TIMEOUT = 30_000

const shippedConfig = configObjectSchema.parse({
  name: 'test-shop',
  clients: {
    storefront: { publicAccessToken: 'token' },
    admin: { accessToken: 'token' },
  },
})

let root: string

function writeProjectFile(path: string, contents: string) {
  const file = join(root, path)

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
}

function introspectionFile(clientType: ShopifyClientType) {
  return `.nuxt/shopify/schema/${kebabCase(clientType)}.${API_VERSION}.schema.json`
}

function createNuxt(rootDir = root, callHook = vi.fn((_hook: string, _payload: unknown) => Promise.resolve())) {
  return { options: { dev: false, _prepare: false, rootDir, srcDir: rootDir, _layers: [] }, callHook, hook: vi.fn() }
}

function storedSchema(clientType: ShopifyClientType) {
  return () => Promise.resolve(join(root, introspectionFile(clientType)))
}

function generateOperations(nuxt: ReturnType<typeof createNuxt>, clientType: ShopifyClientType) {
  const client = kebabCase(clientType)
  const documents = shippedConfig.clients[clientType]!.documents!

  return createOperationsGenerator(nuxt as never, {
    shopName: 'test-shop',
    clientType,
    clientConfig: { apiVersion: API_VERSION, documents, codegen: { globalTypes: false } },
  } as never, `shopify/${client}/${client}.operations.d.ts`, storedSchema(clientType))()
}

function generateAdminTypes(nuxt: ReturnType<typeof createNuxt>) {
  return createTypesGenerator(nuxt as never, {
    shopName: 'test-shop',
    clientType: ShopifyClientType.Admin,
    clientConfig: { apiVersion: API_VERSION, codegen: { globalTypes: false } },
  } as never, 'shopify/admin/admin.types.d.ts', storedSchema(ShopifyClientType.Admin))()
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-routing-'))

  writeProjectFile(introspectionFile(ShopifyClientType.Storefront), readFileSync(HYDROGEN_STOREFRONT_SCHEMA, 'utf8'))
  writeProjectFile(introspectionFile(ShopifyClientType.Admin), JSON.stringify(introspectionFromSchema(buildSchema(ADMIN_SDL))))

  writeProjectFile('server/utils/admin/customers.ts', 'export const customers = `#graphql\n  query AdminCustomers { customers(first: 5) { nodes { id } } }\n`\n')
  writeProjectFile('app/queries/shop.ts', 'export const shop = `#graphql\n  query ShopName { shop { name } }\n`\n')
  writeProjectFile('packages/ui/node_modules/dependency/shop.ts', 'export const shop = `#graphql\n  query DependencyShop { shop { name } }\n`\n')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('document routing', () => {
  it('keeps admin operations and operations in a nested dependency folder out of the storefront types', async () => {
    const nuxt = createNuxt()
    const contents = await generateOperations(nuxt, ShopifyClientType.Storefront)

    expect(getGenerateFailures(nuxt as never)).toEqual([])
    expect(contents).toContain('export type ShopNameQuery =')
    expect(contents).not.toContain('AdminCustomersQuery')
    expect(contents).not.toContain('DependencyShopQuery')
  }, CODEGEN_TIMEOUT)

  it('types admin operations against the admin schema only', async () => {
    const nuxt = createNuxt()
    const contents = await generateOperations(nuxt, ShopifyClientType.Admin)

    expect(getGenerateFailures(nuxt as never)).toEqual([])
    expect(contents).toContain('export type AdminCustomersQuery =')
    expect(contents).not.toContain('ShopNameQuery')
  }, CODEGEN_TIMEOUT)
})

describe('codegen plugins', () => {
  it('loads its codegen plugins from the module, not from the app, whose own copies may be another major version', async () => {
    const app = mkdtempSync(join(tmpdir(), 'nuxt-shopify-app-'))
    const appPlugin = join(app, 'node_modules/@graphql-codegen/typescript')

    mkdirSync(appPlugin, { recursive: true })
    writeFileSync(join(appPlugin, 'package.json'), JSON.stringify({ name: '@graphql-codegen/typescript', version: '0.0.0', type: 'module', main: 'index.js' }))
    writeFileSync(join(appPlugin, 'index.js'), 'export const plugin = () => "export type FromTheApp = true"\n')

    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)

    onTestFinished(() => {
      cwd.mockRestore()
      rmSync(app, { recursive: true, force: true })
    })

    const contents = await generateAdminTypes(createNuxt(app))

    expect(contents).not.toContain('FromTheApp')
    expect(contents).toContain('export type Customer =')
  }, CODEGEN_TIMEOUT)

  it('loads a codegen plugin that the app adds through a hook from the app, when the module has no copy of it', async () => {
    const app = mkdtempSync(join(tmpdir(), 'nuxt-shopify-app-'))
    const appPlugin = join(app, 'node_modules/codegen-app-banner')

    mkdirSync(appPlugin, { recursive: true })
    writeFileSync(join(appPlugin, 'package.json'), JSON.stringify({ name: 'codegen-app-banner', version: '0.0.0', type: 'module', main: 'index.js' }))
    writeFileSync(join(appPlugin, 'index.js'), 'export const plugin = () => "export type FromTheAppPlugin = true"\n')

    onTestFinished(() => {
      rmSync(app, { recursive: true, force: true })
    })

    const nuxt = createNuxt(app, vi.fn((_hook: string, { config }: { config: { plugins: unknown[] } }) => {
      config.plugins.push('app-banner')

      return Promise.resolve()
    }) as never)

    const contents = await generateAdminTypes(nuxt)

    expect(getGenerateFailures(nuxt as never)).toEqual([])
    expect(contents).toContain('export type FromTheAppPlugin = true')
    expect(contents).toContain('export type Customer =')
  }, CODEGEN_TIMEOUT)
})
