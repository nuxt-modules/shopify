import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const { ShopifyClientType } = await import('#src/schemas')
const {
  getConfiguredClients,
  getPresetBuyerIpHeader,
  hasPublicClient,
  isPublicClient,
  registerCustomerAccountRoutes,
  registerCustomerAccountSession,
  registerShopifyRoutes,
  warnInsecureCustomerAccountDevServer,
} = await import('#src/utils/clients')
const { CUSTOMER_ACCOUNT_ROUTES, STOREFRONT_ROUTES } = await import('#src/utils/routes')

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
  it('reports every configured client', () => {
    const clients = getConfiguredClients({
      clients: {
        storefront: { privateAccessToken: 'private' },
        admin: { accessToken: 'shpat_x' },
      },
    } as never)

    expect(clients).toEqual([ShopifyClientType.Storefront, ShopifyClientType.Admin])
  })
})

describe('getPresetBuyerIpHeader', () => {
  it.each([
    ['vercel', 'x-real-ip'],
    ['vercel-edge', 'x-real-ip'],
    ['netlify', 'x-nf-client-connection-ip'],
    ['netlify-edge', 'x-nf-client-connection-ip'],
    ['cloudflare-pages', 'cf-connecting-ip'],
    ['cloudflare-module', 'cf-connecting-ip'],
  ])('reads the buyer ip from the header %s sets itself', (preset, header) => {
    expect(getPresetBuyerIpHeader(preset)).toBe(header)
  })

  it.each([
    ['node-server'],
    ['nitro-dev'],
    [undefined],
  ])('falls back to the socket address on %s', (preset) => {
    expect(getPresetBuyerIpHeader(preset)).toBeUndefined()
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

describe('registerCustomerAccountRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serves the session and the customer account proxy next to Hydrogen\'s account routes', () => {
    registerCustomerAccountRoutes({ clientId: 'client', proxy: true } as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledTimes(2)
    expect(addServerHandler).toHaveBeenCalledWith({
      method: 'get',
      route: '/account/session',
      handler: './runtime/server/api/customer-account/session',
    })
    expect(addServerHandler).toHaveBeenCalledWith({
      method: 'post',
      route: '/account/customer/api/:version/graphql',
      handler: './runtime/server/api/customer-account/proxy',
    })
  })

  it('serves no proxy when it is turned off', () => {
    registerCustomerAccountRoutes({ clientId: 'client', proxy: false } as never, resolver as never)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ route: '/account/session' }))
  })
})

describe('registerCustomerAccountSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers the route middleware under the name pages put in definePageMeta', () => {
    registerCustomerAccountSession(resolver as never)

    expect(addRouteMiddleware).toHaveBeenCalledExactlyOnceWith({
      name: 'shopify:customer-account',
      path: './runtime/middleware/customer-account',
      global: false,
    })
  })
})

describe('warnInsecureCustomerAccountDevServer', () => {
  type Listener = { url?: string }

  function createNuxt({ dev = true, url = 'http://localhost:4123' } = {}) {
    const hooks: Record<string, Array<(...args: never[]) => unknown>> = {}

    return {
      options: { dev, devServer: { url } },

      hook(name: string, handler: (...args: never[]) => unknown) {
        (hooks[name] ??= []).push(handler)
      },

      async callHook(name: string, ...args: unknown[]) {
        for (const handler of hooks[name] ?? []) await handler(...args as never[])
      },
    }
  }

  async function listen(nuxt: ReturnType<typeof createNuxt>, listener: Listener) {
    await nuxt.callHook('listen', undefined, listener)
  }

  beforeEach(() => {
    warn.mockClear()
  })

  it('warns once the dev server listens on plain http', async () => {
    const nuxt = createNuxt()

    warnInsecureCustomerAccountDevServer(nuxt as never)

    await listen(nuxt, { url: 'http://localhost:3311/' })

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3311/'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('localHttps'))
  })

  it('warns for a dev server on https that runs on localhost, which Shopify doesn\'t accept either', async () => {
    for (const url of ['https://localhost:3311/', 'https://127.0.0.1:3311/', 'https://[::1]:3311/']) {
      const nuxt = createNuxt()

      warnInsecureCustomerAccountDevServer(nuxt as never)

      await listen(nuxt, { url })

      expect(warn).toHaveBeenLastCalledWith(expect.stringContaining(url))
    }

    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('stays quiet for a dev server on an https host other than localhost', async () => {
    const nuxt = createNuxt()

    warnInsecureCustomerAccountDevServer(nuxt as never)

    await listen(nuxt, { url: 'https://local.tryhydrogen.dev:5173/' })

    expect(warn).not.toHaveBeenCalled()
  })

  it('checks the configured dev server url when the listener reports none', async () => {
    const nuxt = createNuxt({ url: 'http://localhost:4123' })

    warnInsecureCustomerAccountDevServer(nuxt as never)

    await listen(nuxt, {})

    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('http://localhost:4123'))
  })

  it('stays quiet before the dev server is listening', () => {
    warnInsecureCustomerAccountDevServer(createNuxt() as never)

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing outside dev', async () => {
    const nuxt = createNuxt({ dev: false })

    warnInsecureCustomerAccountDevServer(nuxt as never)

    await listen(nuxt, { url: 'http://localhost:3311/' })

    expect(warn).not.toHaveBeenCalled()
  })
})
