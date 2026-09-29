import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSchema, introspectionFromSchema } from 'graphql'
import { kebabCase } from 'scule'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { clearGenerateFailures, createOperationsGenerator, getGenerateFailures } from '#src/utils/codegen'
import { expectedAdminDocuments, expectedStorefrontDocuments } from '#test/helpers/codegen'

const STOREFRONT_SCHEMA = fileURLToPath(import.meta.resolve('@shopify/hydrogen/storefront.schema.json'))

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

let root: string
let schemas: string

function writeProjectFile(path: string, contents: string) {
  const file = join(root, path)

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
}

function operationsData(clientType: ShopifyClientType, documents: string[], introspection: string) {
  const client = kebabCase(clientType)

  return {
    nuxt: {
      options: { dev: false, _prepare: false, rootDir: root },
      callHook: vi.fn(() => Promise.resolve()),
    },
    options: {
      filename: `shopify/${client}/${client}.operations.d.ts`,
      shopName: 'test-shop',
      clientType,
      clientConfig: { apiVersion: '2026-04', documents, codegen: { autoImport: false } },
      introspection,
    },
  } as never
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-routing-'))
  schemas = mkdtempSync(join(tmpdir(), 'nuxt-shopify-schemas-'))

  writeFileSync(join(schemas, 'admin.schema.json'), JSON.stringify(introspectionFromSchema(buildSchema(ADMIN_SDL))))

  writeProjectFile('server/utils/admin/customers.ts', 'export const customers = `#graphql\n  query AdminCustomers { customers(first: 5) { nodes { id } } }\n`\n')
  writeProjectFile('app/queries/shop.ts', 'export const shop = `#graphql\n  query ShopName { shop { name } }\n`\n')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(schemas, { recursive: true, force: true })
})

beforeEach(() => {
  clearGenerateFailures()
})

describe('document routing', () => {
  it('keeps admin operations out of the storefront types', async () => {
    const generateOperations = createOperationsGenerator()!
    const contents = await generateOperations(operationsData(ShopifyClientType.Storefront, expectedStorefrontDocuments, STOREFRONT_SCHEMA))

    expect(getGenerateFailures()).toEqual([])
    expect(contents).toContain('export type ShopNameQuery =')
    expect(contents).not.toContain('AdminCustomersQuery')
  }, CODEGEN_TIMEOUT)

  it('types admin operations against the admin schema only', async () => {
    const generateOperations = createOperationsGenerator()!
    const contents = await generateOperations(operationsData(ShopifyClientType.Admin, expectedAdminDocuments, join(schemas, 'admin.schema.json')))

    expect(getGenerateFailures()).toEqual([])
    expect(contents).toContain('export type AdminCustomersQuery =')
    expect(contents).not.toContain('ShopNameQuery')
  }, CODEGEN_TIMEOUT)
})
