import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('#src/utils/log', () => ({ useLogger: () => ({ warn, debug: vi.fn(), info: vi.fn(), error: vi.fn() }) }))

const { default: setupCustomerAccountClient } = await import('#src/setup/clients/customer-account')

const resolver = { resolve: (path: string) => path }

const nuxt = () => ({
  options: { dev: false, serverHandlers: [], optimization: { keyedComposables: [] } },
  hook: vi.fn(),
})

const customerAccount = { clientId: 'client', proxy: true, tokenStorage: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setupCustomerAccountClient', () => {
  it('asks for a market when there is no storefront client to look the shop\'s default market up with', () => {
    setupCustomerAccountClient(nuxt() as never, { clients: { customerAccount }, analytics: false } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Set `defaultMarket`'))
  })

  it('still asks when the market is only the empty placeholder declared for environment variables', () => {
    setupCustomerAccountClient(nuxt() as never, { clients: { customerAccount }, defaultMarket: { country: '', language: '' }, analytics: false } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Set `defaultMarket`'))
  })

  it('stays quiet with a market configured, or with a storefront client', () => {
    setupCustomerAccountClient(nuxt() as never, { clients: { customerAccount }, defaultMarket: { country: 'US', language: 'EN' }, analytics: false } as never, resolver as never)
    setupCustomerAccountClient(nuxt() as never, { clients: { customerAccount, storefront: {} }, analytics: false } as never, resolver as never)

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Set `defaultMarket`'))
  })
})
