import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSchema, introspectionFromSchema } from 'graphql'
import { kebabCase } from 'scule'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType, configObjectSchema } from '#src/schemas'
import { clearGenerateFailures, createOperationsGenerator, getGenerateFailures } from '#src/utils/codegen'
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

function operationsData(clientType: ShopifyClientType) {
  const client = kebabCase(clientType)
  const documents = shippedConfig.clients[clientType]!.documents!

  return {
    nuxt: {
      options: { dev: false, _prepare: false, rootDir: root },
      callHook: vi.fn(() => Promise.resolve()),
    },
    options: {
      filename: `shopify/${client}/${client}.operations.d.ts`,
      shopName: 'test-shop',
      clientType,
      clientConfig: { apiVersion: API_VERSION, documents, codegen: { autoImport: false } },
    },
  } as never
}

function storedSchema(clientType: ShopifyClientType) {
  const schema = join(root, introspectionFile(clientType))

  return { getSchema: () => Promise.resolve(schema) }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-routing-'))

  writeProjectFile(introspectionFile(ShopifyClientType.Storefront), readFileSync(HYDROGEN_STOREFRONT_SCHEMA, 'utf8'))
  writeProjectFile(introspectionFile(ShopifyClientType.Admin), JSON.stringify(introspectionFromSchema(buildSchema(ADMIN_SDL))))

  writeProjectFile('server/utils/admin/customers.ts', 'export const customers = `#graphql\n  query AdminCustomers { customers(first: 5) { nodes { id } } }\n`\n')
  writeProjectFile('app/queries/shop.ts', 'export const shop = `#graphql\n  query ShopName { shop { name } }\n`\n')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

beforeEach(() => {
  clearGenerateFailures()
})

describe('document routing', () => {
  it('keeps admin operations out of the storefront types', async () => {
    const generateOperations = createOperationsGenerator(storedSchema(ShopifyClientType.Storefront))!
    const contents = await generateOperations(operationsData(ShopifyClientType.Storefront))

    expect(getGenerateFailures()).toEqual([])
    expect(contents).toContain('export type ShopNameQuery =')
    expect(contents).not.toContain('AdminCustomersQuery')
  }, CODEGEN_TIMEOUT)

  it('types admin operations against the admin schema only', async () => {
    const generateOperations = createOperationsGenerator(storedSchema(ShopifyClientType.Admin))!
    const contents = await generateOperations(operationsData(ShopifyClientType.Admin))

    expect(getGenerateFailures()).toEqual([])
    expect(contents).toContain('export type AdminCustomersQuery =')
    expect(contents).not.toContain('ShopNameQuery')
  }, CODEGEN_TIMEOUT)
})
