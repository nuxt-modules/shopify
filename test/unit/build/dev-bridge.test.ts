import { beforeEach, describe, expect, it, vi } from 'vitest'

const addServerHandler = vi.fn()

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler,
  addServerImports: vi.fn(),
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

const { registerCustomerAccountDevBridge } = await import('#src/utils/clients')

const TUNNEL = 'https://tunnel.example.dev'
const BRIDGE = '_auth/customer-account/bridge'

const resolver = { resolve: (path: string) => path } as never

type Listener = { url?: string }

function createNuxt({ dev = true } = {}) {
  const hooks: Record<string, Array<(...args: never[]) => unknown>> = {}

  return {
    options: { dev, devServer: { url: 'http://localhost:3000' } },

    hook(name: string, handler: (...args: never[]) => unknown) {
      (hooks[name] ??= []).push(handler)
    },

    async callHook(name: string, ...args: unknown[]) {
      for (const handler of hooks[name] ?? []) await handler(...args as never[])
    },
  }
}

const devConfig = (bridgeURL = BRIDGE) => ({ tunnelURL: TUNNEL, bridgeURL })

const DEV_ORIGIN_ENV = '__NUXT_SHOPIFY_DEV_ORIGIN'

async function listen(nuxt: ReturnType<typeof createNuxt>, listener: Listener) {
  await nuxt.callHook('listen', undefined, listener)
}

beforeEach(() => {
  process.env[DEV_ORIGIN_ENV] = ''
})

describe('customer account dev bridge registration', () => {
  it('registers the bridge route when a tunnel is configured', () => {
    addServerHandler.mockClear()

    registerCustomerAccountDevBridge(createNuxt() as never, { dev: devConfig() } as never, resolver)

    expect(addServerHandler).toHaveBeenCalledWith(expect.objectContaining({ route: '/_auth/customer-account/bridge' }))
  })

  it('does nothing outside dev, or without a tunnel', () => {
    addServerHandler.mockClear()

    registerCustomerAccountDevBridge(createNuxt({ dev: false }) as never, { dev: devConfig() } as never, resolver)
    registerCustomerAccountDevBridge(createNuxt() as never, { dev: { bridgeURL: BRIDGE } } as never, resolver)

    expect(addServerHandler).not.toHaveBeenCalled()
  })

  it('publishes the dev server origin once the dev server is listening', async () => {
    const nuxt = createNuxt()

    registerCustomerAccountDevBridge(nuxt as never, { dev: devConfig() } as never, resolver)

    await listen(nuxt, { url: 'http://localhost:3311/' })

    expect(process.env[DEV_ORIGIN_ENV]).toBe('http://localhost:3311/')
  })

  it('publishes nothing before the dev server is listening', () => {
    registerCustomerAccountDevBridge(createNuxt() as never, { dev: devConfig() } as never, resolver)

    expect(process.env[DEV_ORIGIN_ENV]).toBe('')
  })

  it('falls back to the configured dev server url when the listener reports none', async () => {
    const nuxt = createNuxt()

    registerCustomerAccountDevBridge(nuxt as never, { dev: devConfig() } as never, resolver)

    await listen(nuxt, {})

    expect(process.env[DEV_ORIGIN_ENV]).toBe('http://localhost:3000')
  })

  it('publishes nothing outside dev', async () => {
    const nuxt = createNuxt({ dev: false })

    registerCustomerAccountDevBridge(nuxt as never, { dev: devConfig() } as never, resolver)

    await listen(nuxt, { url: 'http://localhost:3311/' })

    expect(process.env[DEV_ORIGIN_ENV]).toBe('')
  })
})
