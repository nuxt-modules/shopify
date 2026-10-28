import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { API_VERSION } from '#test/helpers/api-version'

const generate = vi.fn()
const installedVersions = new Map<string, string>()

vi.mock('@graphql-codegen/cli', () => ({
  generate: (...args: unknown[]) => generate(...args as []),
}))

vi.mock('#src/utils/install', async importOriginal => ({
  ...await importOriginal<typeof import('#src/utils/install')>(),
  getInstalledVersion: (id: string) => Promise.resolve(installedVersions.get(id)),
}))

const {
  clearGenerateFailures,
  createIntrospectionGenerator,
  createOperationsGenerator,
  createTypesGenerator,
  getGenerateFailures,
} = await import('#src/utils/codegen')

const { useLogger } = await import('#src/utils/log')

const warn = vi.spyOn(useLogger(), 'warn')

const FILENAME = `schema/storefront.${API_VERSION}.schema.json`

let dir: string

const pathFor = (name: string) => join(dir, name)

const nuxt = {
  options: { dev: false, _prepare: true },
  callHook: vi.fn(() => Promise.resolve()),
} as never

function createIntrospection(path: string, clientType = ShopifyClientType.Storefront, apiVersion = API_VERSION) {
  return createIntrospectionGenerator({
    filename: FILENAME,
    shopName: 'test-shop',
    clientType,
    clientConfig: { apiVersion, mock: true },
  } as never, path)
}

function introspect(path: string, clientType?: ShopifyClientType, apiVersion?: string) {
  return createIntrospection(path, clientType, apiVersion).getContents({ nuxt })
}

function storedSchema(path: string) {
  return { getSchema: () => Promise.resolve(path) }
}

function generateOperations(data: never) {
  return createOperationsGenerator(storedSchema(pathFor('populated.json')))!(data)
}

function schemaOfCall(index: number) {
  return generate.mock.calls.at(index)![0].generates[FILENAME].schema
}

function schemasFor(filename: string) {
  return generate.mock.calls
    .map(([input]) => input.generates[filename]?.schema)
    .filter(Boolean)
}

const succeeds = () => Promise.resolve([{ content: '{"__schema":{}}' }])
const fails = () => Promise.reject(new Error('Failed to load schema from https://mock.shop/api:\nconnect ETIMEDOUT 23.227.38.74:443'))
const invalid = () => Promise.reject(new Error('Type Shop must define one or more fields.'))

const MOCK_API_SCHEMA = [{ 'https://mock.shop/api': { headers: {} } }]

beforeEach(() => {
  vi.clearAllMocks()

  dir = mkdtempSync(join(tmpdir(), 'nuxt-shopify-codegen-'))

  writeFileSync(pathFor('empty.json'), '')
  writeFileSync(pathFor('populated.json'), JSON.stringify({ __schema: { types: [] } }))
})

afterEach(() => {
  vi.useRealTimers()

  installedVersions.clear()

  rmSync(dir, { recursive: true, force: true })
})

describe('introspection source', () => {
  beforeEach(() => {
    generate.mockImplementation(succeeds)
  })

  it('uses a stored introspection file that has content', async () => {
    await introspect(pathFor('populated.json'))

    expect(schemaOfCall(0)).toBe(pathFor('populated.json'))
  })

  it('asks the api when a failed fetch left the file empty', async () => {
    await introspect(pathFor('empty.json'))

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
  })

  it('reads the customer account schema from the installed hydrogen package', async () => {
    await introspect(pathFor('missing.json'), ShopifyClientType.CustomerAccount)

    expect(schemaOfCall(0)).toEqual([expect.stringContaining('customer-account.schema.json')])
    expect(existsSync(schemaOfCall(0)[0])).toBe(true)
  })
})

describe('hydrogen schema version', () => {
  beforeEach(() => {
    generate.mockImplementation(succeeds)
  })

  it('warns when the customer account types follow another api version than the client', async () => {
    installedVersions.set('@shopify/hydrogen', '2025.7.0')

    await introspect(pathFor('missing.json'), ShopifyClientType.CustomerAccount, '2025-04')

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('API version `2025-07`, but the client uses `2025-04`'))
  })

  it('stays quiet when both use the same api version', async () => {
    installedVersions.set('@shopify/hydrogen', '2025.4.0')

    await introspect(pathFor('missing.json'), ShopifyClientType.CustomerAccount, '2025-04')

    expect(warn).not.toHaveBeenCalled()
  })

  it('stays quiet when a hook replaced the hydrogen schema', async () => {
    installedVersions.set('@shopify/hydrogen', '2025.7.0')

    const replacing = {
      options: { dev: false, _prepare: true },
      callHook: (_hook: string, { config }: { config: { schema: unknown } }) => {
        config.schema = pathFor('populated.json')

        return Promise.resolve()
      },
    } as never

    await createIntrospection(pathFor('missing.json'), ShopifyClientType.CustomerAccount, '2025-04').getContents({ nuxt: replacing })

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('shared schema', () => {
  const TYPES_FILE = 'shopify/storefront/storefront.types.d.ts'
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

  const build = {
    options: { dev: false, _prepare: false },
    callHook: vi.fn(() => Promise.resolve()),
  } as never

  const generatorData = (filename: string) => ({
    nuxt: build,
    options: {
      filename,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { autoImport: false } },
    },
  }) as never

  function generateAll(path: string) {
    const introspection = createIntrospection(path)

    return Promise.all([
      createTypesGenerator(introspection)!(generatorData(TYPES_FILE)),
      createOperationsGenerator(introspection)!(generatorData(OPERATIONS_FILE)),
      introspection.getContents({ nuxt: build }),
    ])
  }

  beforeEach(() => {
    clearGenerateFailures()
  })

  it('generates types and operations from the introspected schema instead of asking the api again', async () => {
    generate.mockImplementation(succeeds)

    await generateAll(pathFor('missing.json'))

    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA])
    expect(schemasFor(TYPES_FILE)).toEqual([pathFor('missing.json')])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([pathFor('missing.json')])
  })

  it('falls back to the hydrogen schema without retrying an invalid api schema and generates types and operations from it', async () => {
    generate.mockImplementationOnce(invalid).mockImplementation(succeeds)

    const [, , introspection] = await generateAll(pathFor('missing.json'))

    expect(introspection).toBe('{"__schema":{}}')
    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, [expect.stringContaining('storefront.schema.json')]])
    expect(schemasFor(TYPES_FILE)).toEqual([pathFor('missing.json')])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([pathFor('missing.json')])
  })

  it('reports one failure and leaves types and operations empty when no schema could be introspected', async () => {
    generate.mockImplementation(invalid)

    await expect(generateAll(pathFor('missing.json'))).resolves.toEqual(['', '', ''])

    expect(schemasFor(TYPES_FILE)).toEqual([])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([])
    expect(getGenerateFailures()).toHaveLength(1)
  })
})

describe('global type declarations', () => {
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

  const operationsData = (autoImport: boolean) => ({
    nuxt,
    options: {
      filename: OPERATIONS_FILE,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { autoImport } },
    },
  }) as never

  const generated = [
    'export type GetProductQueryVariables = Exact<{ handle: string }>;',
    'export type GetProductQuery = { product: { id: string } };',
    'export type ProductFieldsFragment = { id: string };',
  ].join('\n')

  beforeEach(() => {
    generate.mockImplementation(() => Promise.resolve([{ content: generated }]))
  })

  it('declares every operation and fragment type globally', async () => {
    const contents = await generateOperations(operationsData(true)) as string

    expect(contents).toContain('declare global {')
    expect(contents).toContain(`type GetProductQuery = import('./storefront.operations.d.ts').GetProductQuery`)
    expect(contents).toContain(`type GetProductQueryVariables = import('./storefront.operations.d.ts').GetProductQueryVariables`)
    expect(contents).toContain(`type ProductFieldsFragment = import('./storefront.operations.d.ts').ProductFieldsFragment`)
  })

  it('leaves the global namespace alone when auto import is disabled', async () => {
    const contents = await generateOperations(operationsData(false)) as string

    expect(contents).not.toContain('declare global {')
    expect(contents).toContain('export type GetProductQuery')
  })

  it('emits no block when the client has no operations', async () => {
    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))

    const contents = await generateOperations(operationsData(true)) as string

    expect(contents).not.toContain('declare global {')
  })
})

describe('introspection retries', () => {
  it('retries when the api call fails', async () => {
    vi.useFakeTimers()

    generate.mockImplementationOnce(fails).mockImplementation(succeeds)

    const result = introspect(pathFor('missing.json'))

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('{"__schema":{}}')
    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, MOCK_API_SCHEMA])
  })

  it('gives up after three tries and uses the hydrogen schema', async () => {
    vi.useFakeTimers()

    generate.mockImplementation(fails)

    const result = introspect(pathFor('missing.json'))

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('')
    expect(generate).toHaveBeenCalledTimes(4)
    expect(schemaOfCall(-1)).toEqual([expect.stringContaining('storefront.schema.json')])
    expect(existsSync(schemaOfCall(-1)[0])).toBe(true)
  })

  it('retries an error that wraps a transport failure', async () => {
    vi.useFakeTimers()

    const aggregate = () => Promise.reject(new AggregateError(
      [new Error('Failed to load schema from https://mock.shop/api: connect ECONNREFUSED')],
      'introspection failed',
    ))

    generate.mockImplementationOnce(aggregate).mockImplementation(succeeds)

    const result = introspect(pathFor('missing.json'))

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('{"__schema":{}}')
    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, MOCK_API_SCHEMA])
  })

  it('does not retry a local schema file', async () => {
    generate.mockImplementation(fails)

    await expect(introspect(pathFor('populated.json')))
      .resolves.toBe('')

    expect(generate).toHaveBeenCalledTimes(1)
  })
})

describe('hydrogen fallback', () => {
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

  const operationsData = () => ({
    nuxt: {
      options: { dev: false, _prepare: false },
      callHook: vi.fn(() => Promise.resolve()),
    },
    options: {
      filename: OPERATIONS_FILE,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { autoImport: false } },
    },
  }) as never

  beforeEach(() => {
    clearGenerateFailures()
  })

  it('reports a document validation error as a failure without trying another schema', async () => {
    generate.mockImplementation(() => Promise.reject(new Error('GraphQL Document Validation failed with 1 errors;\n  Error 0: Cannot query field "customers" on type "QueryRoot".')))

    await expect(generateOperations(operationsData())).resolves.toBe('')

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures()).toEqual([expect.stringContaining('Cannot query field "customers" on type "QueryRoot"')])
  })
})

describe('document parse failures', () => {
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

  let root: string

  const operationsData = () => ({
    nuxt: {
      options: { dev: false, _prepare: false, rootDir: root },
      callHook: vi.fn(() => Promise.resolve()),
    },
    options: {
      filename: OPERATIONS_FILE,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: {
        apiVersion: API_VERSION,
        mock: true,
        documents: ['**/*.{ts,graphql}', '!node_modules'],
        codegen: { autoImport: false },
      },
    },
  }) as never

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-documents-'))

    clearGenerateFailures()

    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reports an operation that fails to parse instead of dropping it silently', async () => {
    writeFileSync(join(root, 'good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(join(root, 'broken.ts'), 'export const broken = `#graphql\n  query Broken { shop { name\n`\n')

    const contents = await generateOperations(operationsData()) as string

    expect(contents).toBe('')
    expect(generate).not.toHaveBeenCalled()

    const failures = getGenerateFailures()

    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain(OPERATIONS_FILE)
    expect(failures[0]).toContain('Syntax Error')
    expect(failures[0]).toContain('broken.ts')
  })

  it('generates as usual when every document parses', async () => {
    writeFileSync(join(root, 'good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(join(root, 'plain.ts'), 'export const plain = 1\n')
    writeFileSync(join(root, 'frag.graphql'), 'fragment ShopFields on Shop { name }\n')

    await generateOperations(operationsData())

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures()).toHaveLength(0)
  })
})

describe('document globs', () => {
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'
  const DOCUMENTS = ['**/*.{ts,graphql}', '!**/admin/*.ts', '!node_modules']

  type OperationsHook = (hook: string, payload: { config: { documents: string[] } }) => Promise<void>

  let root: string

  const operationsData = (callHook: OperationsHook = () => Promise.resolve()) => ({
    nuxt: {
      options: { dev: false, _prepare: true, rootDir: root },
      callHook,
    },
    options: {
      filename: OPERATIONS_FILE,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: {
        apiVersion: API_VERSION,
        mock: true,
        documents: [...DOCUMENTS],
        codegen: { autoImport: false },
      },
    },
  })

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-globs-'))

    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('hands codegen the configured globs to resolve from the project root', async () => {
    await generateOperations(operationsData() as never)

    const [input] = generate.mock.calls[0]!

    expect(input.cwd).toBe(root)
    expect(input.generates[OPERATIONS_FILE].documents).toEqual(DOCUMENTS)
  })

  it('keeps hook changes to the document list out of the client config', async () => {
    const data = operationsData((_hook, { config }) => {
      config.documents.push('extra/**/*.ts')

      return Promise.resolve()
    })

    await generateOperations(data as never)
    await generateOperations(data as never)

    expect(data.options.clientConfig.documents).toEqual(DOCUMENTS)
  })
})
