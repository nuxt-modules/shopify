import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { createSetupNuxt, resolver } from '#test/helpers/nuxt'

const { warn, addComponentsDir } = vi.hoisted(() => ({ warn: vi.fn(), addComponentsDir: vi.fn() }))

vi.mock('@nuxt/kit', () => ({
  addComponentsDir,
  addImports: vi.fn(),
  addNitroPlugin: vi.fn(),
  addPlugin: vi.fn(),
  addRouteMiddleware: vi.fn(),
  addServerHandler: vi.fn(),
  addServerImports: vi.fn(),
  extendRouteRules: vi.fn(),
}))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub({ warn }) }))

const { default: setupAnalytics } = await import('#src/setup/analytics')
const { configObjectSchema } = await import('#src/schemas')

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
    ['when the default locale is only the empty placeholder declared for environment variables', { shopId: '1', i18n: configObjectSchema.parse({ name: 'shop', i18n: { defaultLocale: { country: '', language: '' } } }).i18n }],
    ['when only the default locale is configured', { i18n: { defaultLocale: { country: 'US', language: 'EN' } } }],
  ])('asks for the shop ID and default locale %s', (_, shop) => {
    setupAnalytics(createSetupNuxt() as never, { clients: {}, ...shop, analytics: {} } as never, resolver as never)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`shopId` and `i18n.defaultLocale`'))
  })

  it('stays quiet with the shop ID and default locale configured, or with a storefront client', () => {
    setupAnalytics(createSetupNuxt() as never, { clients: {}, shopId: '1', i18n: { defaultLocale: { country: 'US', language: 'EN' } }, analytics: {} } as never, resolver as never)
    setupAnalytics(createSetupNuxt() as never, { clients: { storefront: {} }, analytics: {} } as never, resolver as never)

    expect(warn).not.toHaveBeenCalled()
  })
})
