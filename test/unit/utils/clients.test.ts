import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { relative } from 'pathe'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolver } from '#test/helpers/nuxt'

const warn = vi.fn()

const serverHandlers: Array<{ handler: string }> = []

const addServerHandler = vi.fn((handler: { handler: string }) => void serverHandlers.push(handler))
const addServerPlugin = vi.fn()
const addPlugin = vi.fn()
const addRouteMiddleware = vi.fn()
const extendRouteRules = vi.fn()

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addPlugin,
  addRouteMiddleware,
  addServerHandler,
  addServerImports: vi.fn(),
  addServerPlugin,
  extendRouteRules,
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}))

const { ShopifyClientType, configObjectSchema } = await import('#src/schemas')
const {
  createDocumentMatcher,
  getConfiguredClients,
  hasPublicClient,
  isPublicClient,
  registerShopifyRoutes,
  splitDocuments,
} = await import('#src/utils/clients')
const { CUSTOMER_ACCOUNT_ROUTES } = await import('#src/runtime/utils/session')
const { STOREFRONT_ROUTES } = await import('#src/utils/routes')

const codegenRequire = createRequire(import.meta.resolve('@graphql-codegen/cli'))
const { CodeFileLoader } = await import(pathToFileURL(codegenRequire.resolve('@graphql-tools/code-file-loader')).href) as typeof import('@graphql-tools/code-file-loader')

const storefront = (client: Record<string, unknown>) => ({ clients: { storefront: client } } as never)

describe('isPublicClient', () => {
  it('treats a storefront with a public access token as public', () => {
    expect(isPublicClient({ publicAccessToken: 'tok' } as never)).toBe(true)
  })

  it('treats a mock storefront as public', () => {
    expect(isPublicClient({ mock: true } as never)).toBe(true)
  })

  it('does not treat a private-token-only storefront as public', () => {
    expect(isPublicClient({ privateAccessToken: 'private' } as never)).toBe(false)
  })
})

describe('hasPublicClient', () => {
  it('is false when the only storefront credential is a private access token', () => {
    expect(hasPublicClient(storefront({ privateAccessToken: 'private' }))).toBe(false)
  })

  it('is true when a public access token is present alongside a private one', () => {
    expect(hasPublicClient(storefront({ privateAccessToken: 'private', publicAccessToken: 'tok' }))).toBe(true)
  })

  it('is true for a mock storefront', () => {
    expect(hasPublicClient(storefront({ mock: true }))).toBe(true)
  })

  it('is true when a customer account client id is configured', () => {
    expect(hasPublicClient({ clients: { customerAccount: { clientId: 'cid' } } } as never)).toBe(true)
  })

  it('is false when only an admin client with a client id is configured', () => {
    expect(hasPublicClient({ clients: { admin: { clientId: 'cid', clientSecret: 'secret' } } } as never)).toBe(false)
  })
})

describe('getConfiguredClients', () => {
  it('reports every configured client with its config, and skips the ones left out', () => {
    const storefront = { privateAccessToken: 'private' }
    const admin = { accessToken: 'shpat_x' }

    expect(getConfiguredClients({ clients: { storefront, customerAccount: undefined, admin } } as never)).toEqual([
      { clientType: ShopifyClientType.Storefront, clientConfig: storefront },
      { clientType: ShopifyClientType.Admin, clientConfig: admin },
    ])
  })
})

describe('registerShopifyRoutes', () => {
  const UNCACHED = [{ cache: false, swr: false, isr: false }, { override: true }]

  const uncachedRoutes = () => extendRouteRules.mock.calls.map(([route, ...rule]) => {
    expect(rule).toStrictEqual(UNCACHED)

    return route
  })

  const nuxt = { options: { serverHandlers } }

  beforeEach(() => {
    serverHandlers.length = 0
    vi.clearAllMocks()
  })

  it('registers the routes middleware, the response headers plugin, the redirects and Shopify\'s scripts once, however many features ask', () => {
    const config = { clients: { storefront: {} }, analytics: false }

    registerShopifyRoutes(nuxt as never, config as never, resolver as never)
    registerShopifyRoutes(nuxt as never, config as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({ middleware: true, handler: './runtime/server/middleware/routes' })
    expect(addServerPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/response-headers')
    expect(addPlugin).toHaveBeenCalledTimes(2)
    expect(addPlugin).toHaveBeenCalledWith({ src: './runtime/plugins/redirects', mode: 'server' })
    expect(addPlugin).toHaveBeenCalledWith('./runtime/plugins/scripts')
  })

  it('keeps every route Hydrogen serves out of route rule caches, such as Vercel\'s ISR', () => {
    registerShopifyRoutes(nuxt as never, { clients: { storefront: {}, customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(uncachedRoutes()).toStrictEqual([...STOREFRONT_ROUTES, ...CUSTOMER_ACCOUNT_ROUTES])
  })

  it('keeps only the customer account routes uncached when nothing else is configured', () => {
    registerShopifyRoutes(nuxt as never, { clients: { customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(uncachedRoutes()).toStrictEqual(CUSTOMER_ACCOUNT_ROUTES)
  })

  it('renders Shopify\'s scripts for analytics without the storefront client', () => {
    registerShopifyRoutes(nuxt as never, { clients: {}, analytics: {} } as never, resolver as never)

    expect(addPlugin).toHaveBeenCalledWith('./runtime/plugins/scripts')
  })

  it('serves only the customer account routes when the customer account client is the only feature', () => {
    registerShopifyRoutes(nuxt as never, { clients: { customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({ middleware: true, handler: './runtime/server/middleware/routes' })
    expect(addServerPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/response-headers')
    expect(addPlugin).not.toHaveBeenCalled()
  })
})

describe('createDocumentMatcher', () => {
  const FILES = [
    'shop.ts',
    'app/shop.ts',
    'app/shop.admin.ts',
    'app/legacy/shop.ts',
    'app/pages/[handle].ts',
    'app/pages/h.ts',
    'legacy/shop.ts',
    'legacy/old/shop.ts',
    'old/shop.ts',
    'node_modules/dependency/shop.ts',
    'packages/ui/node_modules/dependency/shop.ts',
    'types/shop.d.ts',
    '.storybook/shop.ts',
    '.storybook/shop.admin.ts',
  ]

  const PROJECT = [
    'app/pages/index.vue',
    'app/pages/(account)/orders.vue',
    'app/pages/(admin)/dashboard.ts',
    'app/pages/account/index.vue',
    'app/components/shop.customer.vue',
    'app/graphql/customer-account/orders.ts',
    'server/api/admin.get.ts',
    'server/api/products.get.ts',
    'server/utils/admin/customers.ts',
    'shared/queries/shop.graphql',
    'packages/ui/node_modules/dependency/shop.ts',
    'types/shop.d.ts',
  ]

  let files: string
  let project: string

  function createTree(paths: string[]) {
    const root = mkdtempSync(join(tmpdir(), 'nuxt-shopify-documents-'))

    for (const path of paths) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), '')
    }

    return root
  }

  beforeAll(() => {
    files = createTree(FILES)
    project = createTree(PROJECT)
  })

  afterAll(() => {
    for (const root of [files, project]) rmSync(root, { recursive: true, force: true })
  })

  async function filesCodegenReads(root: string, documents: string[]) {
    const { include, exclude } = splitDocuments(documents)
    const paths = await Promise.all(include.map(pattern => new CodeFileLoader().resolveGlobs(pattern, { cwd: root, ignore: exclude })))

    return [...new Set(paths.flat().map(path => relative(root, path)))].sort()
  }

  it.each([
    '**/*.ts !legacy',
    '**/*.ts !app/legacy',
    '**/*.ts !**/legacy',
    '**/*.ts !./legacy',
    '**/*.ts !{legacy,old}',
    '**/*.ts !legacy/*',
    '**/*.ts !legacy/**',
    '**/*.ts !**/legacy/**',
    '**/*.ts !**/*.admin.ts',
    '**/*.ts !node_modules',
    '**/*.ts !**/node_modules/**',
    '**/*.ts !**/*.d.ts',
    '**/*.ts !app/pages/[handle].ts',
    'app\\**\\*.ts !app\\legacy',
    './app/**/*.ts',
    'legacy',
    'legacy/',
    'app/pages/[handle].ts',
    '.storybook/**/*.ts !**/*.admin.ts',
  ])('keeps the files codegen keeps for %s', async (row) => {
    const documents = row.split(' ')
    const kept = await filesCodegenReads(files, documents)

    expect(kept).not.toStrictEqual([])
    expect(FILES.filter(createDocumentMatcher(documents)).sort()).toStrictEqual(kept)
  })

  it.each(Object.values(ShopifyClientType))('keeps the files codegen keeps for the default %s documents', async (clientType) => {
    const { clients } = configObjectSchema.parse({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'token' }, customerAccount: { clientId: 'id' }, admin: { accessToken: 'token' } },
    })

    const documents = clients[clientType]!.documents!
    const kept = await filesCodegenReads(project, documents)

    expect(kept).not.toStrictEqual([])
    expect(PROJECT.filter(createDocumentMatcher(documents)).sort()).toStrictEqual(kept)
  })
})
