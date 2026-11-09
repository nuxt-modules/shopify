import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'

const generate = vi.fn()

vi.mock('@graphql-codegen/cli', () => ({
  generate: (...args: unknown[]) => generate(...args as []),
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

const MOCK_API_SCHEMA = [{ [`https://mock.shop/api/${API_VERSION}/graphql.json`]: { headers: {} } }]

beforeEach(() => {
  vi.clearAllMocks()

  dir = mkdtempSync(join(tmpdir(), 'nuxt-shopify-codegen-'))

  writeFileSync(pathFor('empty.json'), '')
  writeFileSync(pathFor('populated.json'), JSON.stringify({ __schema: { types: [] } }))
})

afterEach(() => {
  vi.useRealTimers()

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

  it('asks the storefront api like the runtime client does, so custom headers win over the token', async () => {
    await createIntrospectionGenerator({
      filename: FILENAME,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: API_VERSION, publicAccessToken: 'public', headers: { 'X-Shopify-Storefront-Access-Token': 'custom', 'X-Custom': '1' } },
    } as never, pathFor('missing.json')).getContents({ nuxt })

    expect(schemaOfCall(0)).toEqual([{
      [`https://test-shop.myshopify.com/api/${API_VERSION}/graphql.json`]: { headers: { 'X-Shopify-Storefront-Access-Token': 'custom', 'X-Custom': '1' } },
    }])
  })

  it('asks the admin api like the runtime client does, so the access token wins over a custom token header', async () => {
    await createIntrospectionGenerator({
      filename: FILENAME,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Admin,
      clientConfig: { apiVersion: API_VERSION, accessToken: 'shpat_test', headers: { 'X-Shopify-Access-Token': 'custom', 'X-Custom': '1' } },
    } as never, pathFor('missing.json')).getContents({ nuxt })

    expect(schemaOfCall(0)).toEqual([{
      [`https://test-shop.myshopify.com/admin/api/${API_VERSION}/graphql.json`]: { headers: { 'X-Shopify-Access-Token': 'shpat_test', 'X-Custom': '1' } },
    }])
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
    await introspect(pathFor('missing.json'), ShopifyClientType.CustomerAccount, OTHER_API_VERSION)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`API version \`${DEFAULT_API_VERSION}\`, but the client uses \`${OTHER_API_VERSION}\``))
  })

  it('stays quiet when both use the same api version', async () => {
    await introspect(pathFor('missing.json'), ShopifyClientType.CustomerAccount, DEFAULT_API_VERSION)

    expect(warn).not.toHaveBeenCalled()
  })

  it('stays quiet when a hook replaced the hydrogen schema', async () => {
    const replacing = {
      options: { dev: false, _prepare: true },
      callHook: (_hook: string, { config }: { config: { schema: unknown } }) => {
        config.schema = pathFor('populated.json')

        return Promise.resolve()
      },
    } as never

    await createIntrospection(pathFor('missing.json'), ShopifyClientType.CustomerAccount, OTHER_API_VERSION).getContents({ nuxt: replacing })

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
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { globalTypes: false } },
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

  it('hands each step\'s config to its shopify:-prefixed hook', async () => {
    generate.mockImplementation(succeeds)

    await generateAll(pathFor('missing.json'))

    const hooks = (build as unknown as { callHook: { mock: { calls: [string][] } } }).callHook.mock.calls.map(([name]) => name)

    expect(hooks).toEqual(expect.arrayContaining([
      'shopify:storefront:generate:introspection',
      'shopify:storefront:generate:types',
      'shopify:storefront:generate:operations',
    ]))
  })

  it('names the customer account client\'s generate hooks in kebab case, like its other hooks', async () => {
    generate.mockImplementation(succeeds)

    const callHook = vi.fn((_name: string) => Promise.resolve())

    const customerAccountData = (filename: string) => ({
      nuxt: { options: { dev: false, _prepare: false }, callHook },
      options: {
        filename,
        shopName: 'test-shop',
        clientType: ShopifyClientType.CustomerAccount,
        clientConfig: { apiVersion: API_VERSION, documents: [], codegen: { globalTypes: false } },
      },
    }) as never

    await createTypesGenerator(storedSchema(pathFor('populated.json')))!(customerAccountData(TYPES_FILE))
    await createOperationsGenerator(storedSchema(pathFor('populated.json')))!(customerAccountData(OPERATIONS_FILE))

    expect(callHook.mock.calls.map(([name]) => name)).toEqual([
      'shopify:customer-account:generate:types',
      'shopify:customer-account:generate:operations',
    ])
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

  it('reports a failed admin token exchange as a failure instead of rejecting the templates', async () => {
    generate.mockImplementation(succeeds)

    const introspection = createIntrospectionGenerator({
      filename: `schema/admin.${API_VERSION}.schema.json`,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Admin,
      clientConfig: { apiVersion: API_VERSION },
    } as never, pathFor('missing.json'))

    await expect(Promise.all([
      introspection.getContents({ nuxt: build }),
      introspection.getSchema(build),
    ])).resolves.toEqual(['', undefined])

    expect(generate).not.toHaveBeenCalled()
    expect(getGenerateFailures()).toEqual([expect.stringContaining('missing `clientId` or `clientSecret`')])
  })
})

describe('global type declarations', () => {
  const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

  const operationsData = (globalTypes: boolean) => ({
    nuxt,
    options: {
      filename: OPERATIONS_FILE,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { globalTypes } },
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

  it('leaves the global namespace alone when `globalTypes` is off', async () => {
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
      clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { globalTypes: false } },
    },
  }) as never

  beforeEach(() => {
    clearGenerateFailures()
  })

  const isRemote = (input: { generates: Record<string, { schema: unknown }> }) => typeof [input.generates[FILENAME]!.schema].flat()[0] !== 'string'

  const remoteAttempts = () => generate.mock.calls.filter(([input]) => isRemote(input)).length

  function failRemotely() {
    generate.mockImplementation(input => isRemote(input) ? invalid() : succeeds())
  }

  it('marks a fallback schema, so the next start tries the API again', async () => {
    const path = pathFor('schema/storefront.json')

    failRemotely()

    await introspect(path)

    expect(existsSync(`${path}.fallback`)).toBe(true)

    generate.mockReset()
    generate.mockImplementation(succeeds)

    await introspect(path)

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
    expect(existsSync(`${path}.fallback`)).toBe(false)
  })

  it('tries the API only once per start while it keeps failing', async () => {
    const path = pathFor('schema/storefront.json')

    failRemotely()

    const introspection = createIntrospection(path)

    await introspection.getContents({ nuxt })
    await introspection.getContents({ nuxt })
    await introspection.getSchema(nuxt)

    expect(remoteAttempts()).toBe(1)
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
        codegen: { globalTypes: false },
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

  it('ignores files without GraphQL that the operation scanner cannot parse, such as newer decorator syntax', async () => {
    writeFileSync(join(root, 'good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(join(root, 'store.ts'), 'function tracked(_value: unknown, _context: unknown) {}\n\nexport class Store {\n  @tracked accessor count = 0\n}\n')

    await generateOperations(operationsData())

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures()).toEqual([])
  })

  it('skips a document file it cannot read, as codegen does, instead of failing the app', async () => {
    writeFileSync(join(root, 'good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(join(root, 'locked.ts'), 'export const locked = 1\n')
    chmodSync(join(root, 'locked.ts'), 0o000)

    await generateOperations(operationsData())

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures()).toEqual([])
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
        codegen: { globalTypes: false },
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

  it('hands codegen the document list a hook changed, without changing the client config', async () => {
    const data = operationsData((_hook, { config }) => {
      config.documents.push('extra/**/*.ts')

      return Promise.resolve()
    })

    await generateOperations(data as never)
    await generateOperations(data as never)

    expect(generate.mock.calls[1]![0].generates[OPERATIONS_FILE].documents).toEqual([...DOCUMENTS, 'extra/**/*.ts'])
    expect(data.options.clientConfig.documents).toEqual(DOCUMENTS)
  })
})
