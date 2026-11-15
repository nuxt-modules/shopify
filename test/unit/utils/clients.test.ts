import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'

import { resolver } from '#test/helpers/nuxt'

const serverHandlers: Array<{ handler: string }> = []

const addServerHandler = vi.fn((handler: { handler: string }) => void serverHandlers.push(handler))
const addNitroPlugin = vi.fn()
const addPlugin = vi.fn()
const extendRouteRules = vi.fn()

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addNitroPlugin,
  addPlugin,
  addServerHandler,
  addServerImports: vi.fn(),
  extendRouteRules,
}))

const { ShopifyClientType, configObjectSchema } = await import('#src/schemas')
const {
  createDocumentMatcher,
  findDocuments,
  getConfiguredClients,
  hasPublicClient,
  registerShopifyRoutes,
} = await import('#src/utils/clients')
const { CUSTOMER_ACCOUNT_ROUTES } = await import('#src/runtime/utils/session')
const { STOREFRONT_ROUTES } = await import('#src/utils/routes')

describe('hasPublicClient', () => {
  it.each([
    [false, 'a storefront whose only credential is a private access token', { storefront: { privateAccessToken: 'private' } }],
    [true, 'a storefront with a public access token', { storefront: { publicAccessToken: 'tok' } }],
    [true, 'a public access token alongside a private one', { storefront: { privateAccessToken: 'private', publicAccessToken: 'tok' } }],
    [true, 'a mock storefront', { storefront: { mock: true } }],
    [true, 'a customer account client', { customerAccount: { clientId: 'cid' } }],
    [false, 'an admin client alone, even with a client id', { admin: { clientId: 'cid', clientSecret: 'secret' } }],
  ])('is %s for %s', (expected, _, clients) => {
    expect(hasPublicClient({ clients } as never)).toBe(expected)
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
    const config = { clients: { storefront: { routes: true } }, analytics: false }

    registerShopifyRoutes(nuxt as never, config as never, resolver as never)
    registerShopifyRoutes(nuxt as never, config as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({ middleware: true, handler: './runtime/server/middleware/routes' })
    expect(addNitroPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/response-headers')
    expect(addPlugin).toHaveBeenCalledTimes(2)
    expect(addPlugin).toHaveBeenCalledWith({ src: './runtime/plugins/redirects', mode: 'server' })
    expect(addPlugin).toHaveBeenCalledWith('./runtime/plugins/scripts')
  })

  it('keeps every route Hydrogen serves out of route rule caches, such as Vercel\'s ISR', () => {
    registerShopifyRoutes(nuxt as never, { clients: { storefront: { routes: true }, customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(uncachedRoutes()).toStrictEqual([...STOREFRONT_ROUTES, ...CUSTOMER_ACCOUNT_ROUTES])
  })

  it('adds none of Shopify\'s storefront routes, the redirects or Shopify\'s scripts when the storefront client turns its routes off', () => {
    registerShopifyRoutes(nuxt as never, { clients: { storefront: { routes: false } }, analytics: false } as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({ middleware: true, handler: './runtime/server/middleware/routes' })
    expect(addNitroPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/response-headers')
    expect(addPlugin).not.toHaveBeenCalled()
    expect(uncachedRoutes()).toStrictEqual([])
  })

  it('keeps the customer account routes when the storefront client turns its routes off', () => {
    registerShopifyRoutes(nuxt as never, { clients: { storefront: { routes: false }, customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(addPlugin).not.toHaveBeenCalled()
    expect(uncachedRoutes()).toStrictEqual(CUSTOMER_ACCOUNT_ROUTES)
  })

  it('renders Shopify\'s scripts for analytics without the storefront client', () => {
    registerShopifyRoutes(nuxt as never, { clients: {}, analytics: {} } as never, resolver as never)

    expect(addPlugin).toHaveBeenCalledWith('./runtime/plugins/scripts')
  })

  it('serves only the customer account routes, uncached, when the customer account client is the only feature', () => {
    registerShopifyRoutes(nuxt as never, { clients: { customerAccount: {} }, analytics: false } as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({ middleware: true, handler: './runtime/server/middleware/routes' })
    expect(addNitroPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/response-headers')
    expect(addPlugin).not.toHaveBeenCalled()
    expect(uncachedRoutes()).toStrictEqual(CUSTOMER_ACCOUNT_ROUTES)
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
    'app/(shop)/shop.ts',
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

  it.each([
    '**/*.ts !legacy',
    '**/*.ts !legacy/',
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
    'app/(shop)',
    'app/pages/[handle].ts',
    '.storybook/**/*.ts !**/*.admin.ts',
  ])('matches the files that codegen reads for %s', async (row) => {
    const documents = row.split(' ')
    const kept = await findDocuments(documents, files)

    expect(kept).not.toStrictEqual([])
    expect(FILES.filter(createDocumentMatcher(documents)).sort()).toStrictEqual(kept)
  })

  it.each(Object.values(ShopifyClientType))('matches the files that codegen reads for the default %s documents', async (clientType) => {
    const { clients } = configObjectSchema.parse({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'token' }, customerAccount: { clientId: 'id' }, admin: { accessToken: 'token' } },
    })

    const documents = clients[clientType]!.documents!
    const kept = await findDocuments(documents, project)

    expect(kept).not.toStrictEqual([])
    expect(PROJECT.filter(createDocumentMatcher(documents)).sort()).toStrictEqual(kept)
  })

  it('finds no files through a folder that is a symlink, such as a linked package or a leftover Vercel build', async () => {
    const root = createTree(['app/shop.ts', 'packages/ui/menu.ts', '.vercel/output/functions/__fallback.func/index.ts'])

    onTestFinished(() => rmSync(root, { recursive: true, force: true }))

    symlinkSync('../packages/ui', join(root, 'app/ui'))
    symlinkSync('__fallback.func', join(root, '.vercel/output/functions/index.func'))

    await expect(findDocuments(['**/*.ts', '.vercel/**/*.ts'], root)).resolves.toStrictEqual([
      '.vercel/output/functions/__fallback.func/index.ts',
      'app/shop.ts',
      'packages/ui/menu.ts',
    ])
  })
})
