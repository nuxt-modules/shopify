import { beforeEach, describe, expect, it, vi } from 'vitest'

const { warn, addComponentsDir } = vi.hoisted(() => ({ warn: vi.fn(), addComponentsDir: vi.fn() }))

vi.mock('@nuxt/kit', () => ({
  addComponentsDir,
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler: vi.fn(),
  addServerImports: vi.fn(),
  addServerPlugin: vi.fn(),
  extendRouteRules: vi.fn(),
}))

vi.mock('#src/utils/log', () => ({ useLogger: () => ({ warn, debug: vi.fn(), info: vi.fn(), error: vi.fn() }) }))

const { default: setupAnalytics } = await import('#src/setup/analytics')

const resolver = { resolve: (path: string) => path }

const nuxt = () => ({
  options: { dev: false, serverHandlers: [], optimization: { keyedComposables: [] } },
  hook: vi.fn(),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setupAnalytics', () => {
  it('registers the analytics components under their public `Shopify` names', () => {
    setupAnalytics(nuxt() as never, { clients: { storefront: {} }, analytics: {} } as never, resolver as never)

    expect(addComponentsDir).toHaveBeenCalledExactlyOnceWith({ path: './runtime/components/analytics', pathPrefix: false, prefix: 'Shopify' })
  })

  it('asks for the shop ID and market when there is no storefront client to look them up with', () => {
    setupAnalytics(nuxt() as never, { clients: {}, analytics: {} } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`shopId` and `defaultMarket`'))
  })

  it('still asks when the market is only the empty placeholder declared for environment variables', () => {
    setupAnalytics(nuxt() as never, { clients: {}, shopId: '1', defaultMarket: { country: '', language: '' }, analytics: {} } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`shopId` and `defaultMarket`'))
  })

  it('stays quiet with the shop ID and market configured, or with a storefront client', () => {
    setupAnalytics(nuxt() as never, { clients: {}, shopId: '1', defaultMarket: { country: 'US', language: 'EN' }, analytics: {} } as never, resolver as never)
    setupAnalytics(nuxt() as never, { clients: { storefront: {} }, analytics: {} } as never, resolver as never)

    expect(warn).not.toHaveBeenCalled()
  })
})
