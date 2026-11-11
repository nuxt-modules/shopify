import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { createSetupNuxt, resolver } from '#test/helpers/nuxt'

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

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub({ warn }) }))

const { default: setupAnalytics } = await import('#src/setup/analytics')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setupAnalytics', () => {
  it('registers the analytics components under their public `Shopify` names', () => {
    setupAnalytics(createSetupNuxt() as never, { clients: { storefront: {} }, analytics: {} } as never, resolver as never)

    expect(addComponentsDir).toHaveBeenCalledExactlyOnceWith({ path: './runtime/components/analytics', pathPrefix: false, prefix: 'Shopify' })
  })

  it.each([
    ['when there is no storefront client to look them up with', {}],
    ['when the market is only the empty placeholder declared for environment variables', { shopId: '1', defaultMarket: { country: '', language: '' } }],
    ['when only the market is configured', { defaultMarket: { country: 'US', language: 'EN' } }],
  ])('asks for the shop ID and market %s', (_, shop) => {
    setupAnalytics(createSetupNuxt() as never, { clients: {}, ...shop, analytics: {} } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`shopId` and `defaultMarket`'))
  })

  it('stays quiet with the shop ID and market configured, or with a storefront client', () => {
    setupAnalytics(createSetupNuxt() as never, { clients: {}, shopId: '1', defaultMarket: { country: 'US', language: 'EN' }, analytics: {} } as never, resolver as never)
    setupAnalytics(createSetupNuxt() as never, { clients: { storefront: {} }, analytics: {} } as never, resolver as never)

    expect(warn).not.toHaveBeenCalled()
  })
})
