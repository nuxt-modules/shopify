import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { createSetupNuxt, resolver } from '#test/helpers/nuxt'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler: vi.fn(),
  addServerImports: vi.fn(),
  addServerPlugin: vi.fn(),
  extendRouteRules: vi.fn(),
}))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub({ warn }) }))

const {
  default: setupCustomerAccountClient,
  registerCustomerAccountRoutes,
  registerCustomerAccountSession,
  warnInsecureCustomerAccountDevServer,
} = await import('#src/setup/clients/customer-account')
const { addRouteMiddleware, addServerHandler } = await import('@nuxt/kit')

const customerAccount = { clientId: 'client', proxy: true, tokenStorage: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setupCustomerAccountClient', () => {
  it.each([
    ['when there is no storefront client to look the shop\'s default market up with', {}],
    ['when the market is only the empty placeholder declared for environment variables', { defaultMarket: { country: '', language: '' } }],
  ])('asks for a market %s', (_, market) => {
    setupCustomerAccountClient(createSetupNuxt() as never, { clients: { customerAccount }, ...market, analytics: false } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Set `defaultMarket`'))
  })

  it('stays quiet with a market configured, or with a storefront client', () => {
    setupCustomerAccountClient(createSetupNuxt() as never, { clients: { customerAccount }, defaultMarket: { country: 'US', language: 'EN' }, analytics: false } as never, resolver as never)
    setupCustomerAccountClient(createSetupNuxt() as never, { clients: { customerAccount, storefront: {} }, analytics: false } as never, resolver as never)

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Set `defaultMarket`'))
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

  it.each([
    'http://localhost:3311/',
    'https://localhost:3311/',
    'https://127.0.0.1:3311/',
    'https://[::1]:3311/',
  ])('warns once the dev server listens on %s, where Shopify can\'t sign customers in', async (url) => {
    const nuxt = createNuxt()

    warnInsecureCustomerAccountDevServer(nuxt as never)

    await listen(nuxt, { url })

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(url))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('localHttps'))
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
