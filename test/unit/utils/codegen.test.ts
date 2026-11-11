import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'

const generate = vi.fn()

vi.mock('@graphql-codegen/cli', () => ({
  generate: (...args: unknown[]) => generate(...args as []),
}))

const updateTemplates = vi.fn()

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<typeof import('@nuxt/kit')>(),
  updateTemplates: (...args: unknown[]) => updateTemplates(...args),
}))

const {
  createOperationsGenerator,
  createSchemaLoader,
  createTypesGenerator,
  getGenerateFailures,
  getIntrospectionFilename,
} = await import('#src/utils/codegen')

const { useLogger } = await import('#src/utils/log')

const warn = vi.spyOn(useLogger(), 'warn')

type Hook = (hook: string, payload: { config: Record<string, unknown> }) => Promise<void> | void

const FILENAME = getIntrospectionFilename(ShopifyClientType.Storefront, API_VERSION)

const OPERATIONS_FILE = 'shopify/storefront/storefront.operations.d.ts'

let dir: string
let nuxt: ReturnType<typeof createNuxt>

function createNuxt(options: Record<string, unknown> = {}, callHook: Hook = () => Promise.resolve()) {
  const watchers: Array<(event: string, file: string) => Promise<unknown>> = []

  return {
    options: { dev: false, _prepare: true, rootDir: dir, srcDir: dir, buildDir: dir, _layers: [], ...options },
    callHook: vi.fn(callHook),
    hook: (name: string, hook: (event: string, file: string) => Promise<unknown>) => {
      if (name === 'builder:watch') watchers.push(hook)
    },
    watch: (file: string) => Promise.all(watchers.map(watcher => watcher('change', file))),
  }
}

function client(clientType = ShopifyClientType.Storefront, clientConfig: Record<string, unknown> = {}) {
  return {
    shopName: 'test-shop',
    clientType,
    clientConfig: { apiVersion: API_VERSION, mock: true, documents: [], codegen: { globalTypes: false }, ...clientConfig },
  } as never
}

const schemaPath = (clientType = ShopifyClientType.Storefront, apiVersion = API_VERSION) => join(dir, getIntrospectionFilename(clientType, apiVersion))

function storeSchema(contents: string, path = schemaPath()) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
}

async function introspect(target = nuxt, clientType?: ShopifyClientType, clientConfig?: Record<string, unknown>) {
  const path = await createSchemaLoader(target as never, client(clientType, clientConfig))()

  return path && readFileSync(path, 'utf8')
}

const storedSchema = () => Promise.resolve(pathFor('populated.json'))

const pathFor = (name: string) => join(dir, name)

function generateOperations(target = nuxt, clientConfig?: Record<string, unknown>) {
  return createOperationsGenerator(target as never, client(ShopifyClientType.Storefront, clientConfig), OPERATIONS_FILE, storedSchema)()
}

function schemaOfCall(index: number) {
  return Object.values<{ schema: unknown }>(generate.mock.calls.at(index)![0].generates)[0]!.schema as string[]
}

function schemasFor(filename: string) {
  return generate.mock.calls
    .map(([input]) => input.generates[filename]?.schema)
    .filter(Boolean)
}

const succeeds = () => Promise.resolve([{ content: '{"__schema":{}}' }])
const fails = () => Promise.reject(new Error('Failed to load schema from https://mock.shop/api:\nconnect ETIMEDOUT 23.227.38.74:443'))
const invalid = () => Promise.reject(new Error('Type Shop must define one or more fields.'))

const MOCK_API_SCHEMA = [{ [`https://mock.shop/api/${API_VERSION}/graphql.json`]: { headers: {}, timeout: 30_000 } }]

beforeEach(() => {
  vi.clearAllMocks()

  dir = mkdtempSync(join(tmpdir(), 'nuxt-shopify-codegen-'))
  nuxt = createNuxt()

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

  it('reads a stored introspection file as it is, without running codegen on it again', async () => {
    storeSchema(JSON.stringify({ __schema: { types: [] } }))

    await expect(introspect()).resolves.toBe(JSON.stringify({ __schema: { types: [] } }))

    expect(generate).not.toHaveBeenCalled()
  })

  it('asks the api when a failed fetch left the file empty', async () => {
    storeSchema('')

    await introspect()

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
  })

  it('asks the storefront api like the runtime client does, so custom headers win over the token', async () => {
    await introspect(nuxt, ShopifyClientType.Storefront, { mock: undefined, publicAccessToken: 'public', headers: { 'X-Shopify-Storefront-Access-Token': 'custom', 'X-Custom': '1' } })

    expect(schemaOfCall(0)).toEqual([{
      [`https://test-shop.myshopify.com/api/${API_VERSION}/graphql.json`]: { headers: { 'X-Shopify-Storefront-Access-Token': 'custom', 'X-Custom': '1' }, timeout: 30_000 },
    }])
  })

  it('asks the admin api like the runtime client does, so the access token wins over a custom token header', async () => {
    await introspect(nuxt, ShopifyClientType.Admin, { mock: undefined, accessToken: 'shpat_test', headers: { 'X-Shopify-Access-Token': 'custom', 'X-Custom': '1' } })

    expect(schemaOfCall(0)).toEqual([{
      [`https://test-shop.myshopify.com/admin/api/${API_VERSION}/graphql.json`]: { headers: { 'X-Shopify-Access-Token': 'shpat_test', 'X-Custom': '1' }, timeout: 30_000 },
    }])
  })

  it.each([
    ['storefront schema of the default API version', ShopifyClientType.Storefront, { apiVersion: DEFAULT_API_VERSION }, 'storefront.schema.json'],
    ['customer account schema', ShopifyClientType.CustomerAccount, {}, 'customer-account.schema.json'],
  ])('reads the %s from the installed hydrogen package, without asking the api', async (_, clientType, clientConfig, schema) => {
    await introspect(nuxt, clientType, clientConfig)

    expect(schemaOfCall(0)).toEqual([expect.stringContaining(schema)])
    expect(existsSync(schemaOfCall(0)[0]!)).toBe(true)
  })
})

describe('hydrogen schema version', () => {
  beforeEach(() => {
    generate.mockImplementation(succeeds)
  })

  it('warns when the customer account types follow another api version than the client', async () => {
    await introspect(nuxt, ShopifyClientType.CustomerAccount, { apiVersion: OTHER_API_VERSION })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`API version \`${DEFAULT_API_VERSION}\`, but the client uses \`${OTHER_API_VERSION}\``))
  })

  it('stays quiet when both use the same api version', async () => {
    await introspect(nuxt, ShopifyClientType.CustomerAccount, { apiVersion: DEFAULT_API_VERSION })

    expect(warn).not.toHaveBeenCalled()
  })

  it('stays quiet when a hook replaced the hydrogen schema', async () => {
    const replacing = createNuxt({}, (_hook, { config }) => {
      config.schema = pathFor('populated.json')
    })

    await introspect(replacing, ShopifyClientType.CustomerAccount, { apiVersion: OTHER_API_VERSION })

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('shared schema', () => {
  const TYPES_FILE = 'shopify/storefront/storefront.types.d.ts'

  let build: ReturnType<typeof createNuxt>

  beforeEach(() => {
    build = createNuxt({ _prepare: false })
  })

  function generateAll(target = build, clientType = ShopifyClientType.Storefront, clientConfig?: Record<string, unknown>) {
    const shop = client(clientType, clientConfig)
    const loadSchema = createSchemaLoader(target as never, shop)

    return Promise.all([
      createTypesGenerator(target as never, shop, TYPES_FILE, loadSchema)(),
      createOperationsGenerator(target as never, shop, OPERATIONS_FILE, loadSchema)(),
      loadSchema(),
    ])
  }

  it('hands each step\'s config to its shopify:-prefixed hook, named in kebab case like the client\'s other hooks', async () => {
    generate.mockImplementation(succeeds)

    await generateAll(build, ShopifyClientType.CustomerAccount)

    expect(build.callHook.mock.calls.map(([name]) => name)).toEqual([
      'shopify:customer-account:generate:introspection',
      'shopify:customer-account:generate:types',
      'shopify:customer-account:generate:operations',
    ])
  })

  it('hands codegen the module\'s own plugin loader in every step', async () => {
    generate.mockImplementation(succeeds)

    await generateAll()

    const own = await import('@graphql-codegen/typescript')

    expect(generate).toHaveBeenCalledTimes(3)

    for (const [input] of generate.mock.calls) {
      await expect(input.pluginLoader('@graphql-codegen/typescript')).resolves.toBe(own)
    }
  })

  it('generates types and operations from the introspected schema instead of asking the api again', async () => {
    generate.mockImplementation(succeeds)

    await generateAll()

    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA])
    expect(schemasFor(TYPES_FILE)).toEqual([schemaPath()])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([schemaPath()])
  })

  it('falls back to the hydrogen schema without retrying an invalid api schema and generates types and operations from it', async () => {
    generate.mockImplementationOnce(invalid).mockImplementation(succeeds)

    await generateAll()

    expect(readFileSync(schemaPath(), 'utf8')).toBe('{"__schema":{}}')
    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, [expect.stringContaining('storefront.schema.json')]])
    expect(schemasFor(TYPES_FILE)).toEqual([schemaPath()])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([schemaPath()])
  })

  it('reports one failure and leaves types and operations empty when no schema could be introspected', async () => {
    generate.mockImplementation(invalid)

    await expect(generateAll()).resolves.toEqual(['', '', undefined])

    expect(schemasFor(TYPES_FILE)).toEqual([])
    expect(schemasFor(OPERATIONS_FILE)).toEqual([])
    expect(getGenerateFailures(build as never)).toHaveLength(1)
  })

  it('reports a failed admin token exchange as a failure instead of rejecting the templates', async () => {
    generate.mockImplementation(succeeds)

    await expect(generateAll(build, ShopifyClientType.Admin, { mock: undefined })).resolves.toEqual(['', '', undefined])

    expect(generate).not.toHaveBeenCalled()
    expect(getGenerateFailures(build as never)).toEqual([expect.stringContaining('missing `clientId` or `clientSecret`')])
  })

  it('asks a failing admin api once per start, although Nuxt generates the templates again on every change', async () => {
    generate.mockImplementation(invalid)

    const admin = client(ShopifyClientType.Admin, { mock: undefined, accessToken: 'shpat_test' })
    const loadSchema = createSchemaLoader(build as never, admin)
    const generateTypes = createTypesGenerator(build as never, admin, TYPES_FILE, loadSchema)
    const generateOperations = createOperationsGenerator(build as never, admin, OPERATIONS_FILE, loadSchema)

    for (let pass = 0; pass < 3; pass++) {
      await generateTypes()
      await generateOperations()
    }

    expect(generate).toHaveBeenCalledOnce()
    expect(getGenerateFailures(build as never)).toHaveLength(1)
  })
})

describe('global type declarations', () => {
  const generated = [
    'export type GetProductQueryVariables = Exact<{ handle: string }>;',
    'export type GetProductQuery = { product: { id: string } };',
    'export type ProductFieldsFragment = { id: string };',
  ].join('\n')

  beforeEach(() => {
    generate.mockImplementation(() => Promise.resolve([{ content: generated }]))
  })

  it('declares every operation and fragment type globally', async () => {
    const contents = await generateOperations(nuxt, { codegen: { globalTypes: true } })

    expect(contents).toContain('declare global {')
    expect(contents).toContain(`type GetProductQuery = import('./storefront.operations.d.ts').GetProductQuery`)
    expect(contents).toContain(`type GetProductQueryVariables = import('./storefront.operations.d.ts').GetProductQueryVariables`)
    expect(contents).toContain(`type ProductFieldsFragment = import('./storefront.operations.d.ts').ProductFieldsFragment`)
  })

  it('leaves the global namespace alone when `globalTypes` is off', async () => {
    const contents = await generateOperations(nuxt, { codegen: { globalTypes: false } })

    expect(contents).not.toContain('declare global {')
    expect(contents).toContain('export type GetProductQuery')
  })

  it('emits no block when the client has no operations', async () => {
    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))

    const contents = await generateOperations(nuxt, { codegen: { globalTypes: true } })

    expect(contents).not.toContain('declare global {')
  })
})

describe('introspection retries', () => {
  it.each([
    ['a request that fails to connect', fails],
    ['an error that wraps a transport failure', () => Promise.reject(new AggregateError(
      [new Error('Failed to load schema from https://mock.shop/api: connect ECONNREFUSED')],
      'introspection failed',
    ))],
    ['a request that Shopify hasn\'t answered in time', () => Promise.reject(new Error(`Failed to load schema from https://mock.shop/api/${API_VERSION}/graphql.json:\n\nThe operation was aborted due to timeout`))],
  ])('retries %s', async (_, failure) => {
    vi.useFakeTimers()

    generate.mockImplementationOnce(failure).mockImplementation(succeeds)

    const result = introspect()

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('{"__schema":{}}')
    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, MOCK_API_SCHEMA])
  })

  it('gives up after three tries and uses the hydrogen schema', async () => {
    vi.useFakeTimers()

    generate.mockImplementation(fails)

    const result = introspect()

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBeUndefined()
    expect(generate).toHaveBeenCalledTimes(4)
    expect(schemaOfCall(-1)).toEqual([expect.stringContaining('storefront.schema.json')])
    expect(existsSync(schemaOfCall(-1)[0]!)).toBe(true)
  })

  it.each([
    ['a request Shopify refused, such as one with a token of another store', `Failed to load schema from https://mock.shop/api/${API_VERSION}/graphql.json:\n\nUnexpected response: 401 Unauthorized\n\nGraphQL Code Generator supports:\n- URL of GraphQL endpoint`],
    ['a refused request because the shop\'s name or a path in the stack mentions the network or a timeout', [
      `Failed to load schema from https://network-gear.myshopify.com/api/${API_VERSION}/graphql.json:`,
      '',
      'introspectionResult.errors.map is not a function',
      'TypeError: introspectionResult.errors.map is not a function',
      '    at introspectSchema (/home/me/timeout-shop/node_modules/@graphql-tools/url-loader/esm/index.js:12:34)',
      '',
      'GraphQL Code Generator supports:',
      '- URL of GraphQL endpoint',
    ].join('\n')],
  ])('does not retry %s', async (_, message) => {
    vi.useFakeTimers()

    generate.mockImplementation(() => Promise.reject(new Error(message)))

    const result = introspect()

    await vi.advanceTimersByTimeAsync(60_000)
    await result

    expect(schemasFor(FILENAME)).toEqual([MOCK_API_SCHEMA, [expect.stringContaining('storefront.schema.json')]])
  })

  it('does not retry a local schema file', async () => {
    generate.mockImplementation(fails)

    const local = createNuxt({}, (_hook, { config }) => {
      config.schema = pathFor('populated.json')
    })

    await expect(introspect(local)).resolves.toBeUndefined()

    expect(generate).toHaveBeenCalledTimes(1)
  })
})

describe('hydrogen fallback', () => {
  const isRemote = (input: { generates: Record<string, { schema: unknown }> }) => typeof [input.generates[FILENAME]!.schema].flat()[0] !== 'string'

  const remoteAttempts = () => generate.mock.calls.filter(([input]) => isRemote(input)).length

  function failRemotely() {
    generate.mockImplementation(input => isRemote(input) ? invalid() : succeeds())
  }

  it('marks a fallback schema, so the next start tries the API again', async () => {
    failRemotely()

    await introspect()

    expect(existsSync(`${schemaPath()}.fallback`)).toBe(true)

    generate.mockReset()
    generate.mockImplementation(succeeds)

    await introspect(createNuxt())

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
    expect(existsSync(`${schemaPath()}.fallback`)).toBe(false)
  })

  it('tries the API only once per start while it keeps failing', async () => {
    failRemotely()

    const loadSchema = createSchemaLoader(nuxt as never, client())

    await loadSchema()
    await loadSchema()
    await loadSchema()

    expect(remoteAttempts()).toBe(1)
  })

  it('reports a document validation error as a failure without trying another schema', async () => {
    generate.mockImplementation(() => Promise.reject(new Error('GraphQL Document Validation failed with 1 errors;\n  Error 0: Cannot query field "customers" on type "QueryRoot".')))

    const build = createNuxt({ _prepare: false })

    await expect(generateOperations(build)).resolves.toBe('')

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures(build as never)).toEqual([expect.stringContaining('Cannot query field "customers" on type "QueryRoot"')])
  })
})

describe('document parse failures', () => {
  let build: ReturnType<typeof createNuxt>

  const operations = () => generateOperations(build, { documents: ['**/*.{ts,vue,graphql}', '!node_modules'] })

  beforeEach(() => {
    build = createNuxt({ _prepare: false, srcDir: pathFor('app'), buildDir: pathFor('.nuxt') })

    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))
  })

  it('reports an operation that fails to parse instead of dropping it silently', async () => {
    writeFileSync(pathFor('good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(pathFor('broken.ts'), 'export const broken = `#graphql\n  query Broken { shop { name\n`\n')

    const contents = await operations()

    expect(contents).toBe('')
    expect(generate).not.toHaveBeenCalled()

    const failures = getGenerateFailures(build as never)

    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain(OPERATIONS_FILE)
    expect(failures[0]).toContain('Syntax Error')
    expect(failures[0]).toContain('broken.ts')
  })

  it('reports an operation that fails to parse in a dynamic route file, whose brackets are no glob', async () => {
    mkdirSync(pathFor('pages/products'), { recursive: true })
    writeFileSync(pathFor('pages/products/[handle].vue'), '<script setup lang="ts">\nconst query = `#graphql\n  query Broken { shop { name\n`\n</script>\n')

    await expect(operations()).resolves.toBe('')

    expect(generate).not.toHaveBeenCalled()
    expect(getGenerateFailures(build as never)).toEqual([expect.stringContaining('[handle].vue')])
  })

  it('ignores files without GraphQL that the operation scanner cannot parse, such as newer decorator syntax', async () => {
    writeFileSync(pathFor('good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(pathFor('store.ts'), 'function tracked(_value: unknown, _context: unknown) {}\n\nexport class Store {\n  @tracked accessor count = 0\n}\n')

    await operations()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures(build as never)).toEqual([])
  })

  it('skips a document file it cannot read, as codegen does, instead of failing the app', async () => {
    writeFileSync(pathFor('good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    writeFileSync(pathFor('locked.ts'), 'export const locked = 1\n')
    chmodSync(pathFor('locked.ts'), 0o000)

    await operations()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures(build as never)).toEqual([])
  })

  it('skips a broken operation in a folder that a ! entry excludes, as codegen does', async () => {
    writeFileSync(pathFor('good.ts'), 'export const good = `#graphql\n  query Good { shop { name } }\n`\n')
    mkdirSync(pathFor('node_modules/dependency'), { recursive: true })
    writeFileSync(pathFor('node_modules/dependency/broken.ts'), 'export const broken = `#graphql\n  query Broken { shop { name\n`\n')

    await operations()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(getGenerateFailures(build as never)).toEqual([])
  })
})

describe('document globs', () => {
  const DOCUMENTS = ['**/*.{ts,graphql}', '!**/admin/*.ts', '!node_modules']

  beforeEach(() => {
    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))
  })

  it('hands codegen the configured globs to resolve from the project root', async () => {
    await generateOperations(createNuxt({ srcDir: pathFor('app'), buildDir: pathFor('.nuxt') }), { documents: [...DOCUMENTS] })

    const [input] = generate.mock.calls[0]!

    expect(input.cwd).toBe(dir)
    expect(input.generates[OPERATIONS_FILE].documents).toEqual(DOCUMENTS)
  })

  it('hands codegen the document list a hook changed, without changing the client config', async () => {
    const extending = createNuxt({}, (_hook, { config }) => {
      (config.documents as string[]).push('extra/**/*.ts')
    })

    const documents = [...DOCUMENTS]
    const shop = client(ShopifyClientType.Storefront, { documents })

    await createOperationsGenerator(extending as never, shop, OPERATIONS_FILE, storedSchema)()

    expect(generate.mock.calls[0]![0].generates[OPERATIONS_FILE].documents).toEqual([...DOCUMENTS, 'extra/**/*.ts'])
    expect(documents).toEqual(DOCUMENTS)
  })
})

describe('operation cache', () => {
  let watched: ReturnType<typeof createNuxt>

  const generator = () => createOperationsGenerator(watched as never, client(ShopifyClientType.Storefront, { documents: ['**/*.ts'] }), OPERATIONS_FILE, storedSchema)

  beforeEach(() => {
    watched = createNuxt({ dev: true, _prepare: false })

    generate.mockImplementation(() => Promise.resolve([{ content: 'interface GeneratedQueryTypes {}' }]))
  })

  it('generates the operations once until a document changes, as Nuxt asks for every template on every file change', async () => {
    writeFileSync(pathFor('shop.ts'), 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n')

    const generateOperations = generator()

    await generateOperations()
    await generateOperations()

    expect(generate).toHaveBeenCalledOnce()

    await watched.watch(pathFor('shop.ts'))
    await generateOperations()

    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('remembers which documents contain GraphQL, so removing the last operation from one regenerates too', async () => {
    writeFileSync(pathFor('shop.ts'), 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n')
    writeFileSync(pathFor('math.ts'), 'export const add = (a: number, b: number) => a + b\n')

    await generator()()

    writeFileSync(pathFor('shop.ts'), 'export const query = undefined\n')

    await watched.watch(pathFor('math.ts'))

    expect(updateTemplates).not.toHaveBeenCalled()

    await watched.watch(pathFor('shop.ts'))

    expect(updateTemplates).toHaveBeenCalledOnce()
  })

  it('keeps the newer result when an older generation finishes last', async () => {
    writeFileSync(pathFor('shop.ts'), 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n')

    const generateOperations = generator()

    let finishOlder!: (output: Array<{ content: string }>) => void

    generate.mockImplementationOnce(() => new Promise((resolve) => {
      finishOlder = resolve
    }))

    const older = generateOperations()

    await vi.waitFor(() => expect(generate).toHaveBeenCalledOnce())

    await watched.watch(pathFor('shop.ts'))
    await generateOperations()

    finishOlder([{ content: 'interface OlderQueryTypes {}' }])

    await older

    await expect(generateOperations()).resolves.toContain('GeneratedQueryTypes')
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('leaves the documents it found to the newer generation when a document changes while it runs', async () => {
    writeFileSync(pathFor('shop.ts'), 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n')
    writeFileSync(pathFor('newer.ts'), 'export const query = `#graphql\n  query Newer { shop { name } }\n`\n')

    watched = createNuxt({ dev: true, _prepare: false }, async () => {
      writeFileSync(pathFor('newer.ts'), 'export const query = `#graphql\n  query Newer { shop { id } }\n`\n')

      await watched.watch(pathFor('newer.ts'))

      rmSync(pathFor('newer.ts'))
    })

    await generator()()

    updateTemplates.mockClear()

    writeFileSync(pathFor('newer.ts'), 'export const query = undefined\n')

    await watched.watch(pathFor('newer.ts'))

    expect(updateTemplates).toHaveBeenCalledOnce()
  })
})
