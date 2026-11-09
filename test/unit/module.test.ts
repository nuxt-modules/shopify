import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createLoggerStub } from '#test/helpers/logger'
import { resolver } from '#test/helpers/nuxt'

const logger = createLoggerStub()

const runtimeConfig: { shopify?: Record<string, unknown>, public: { shopify?: Record<string, unknown> } } = { public: {} }

const setupSteps = vi.hoisted(() => ({
  setupConfig: vi.fn(),
  setupAnalytics: vi.fn(),
  setupClients: vi.fn(),
  setupCodegen: vi.fn(),
  setupGraphqlConfig: vi.fn(),
  setupGraphqlTransform: vi.fn(),
  setupImports: vi.fn(),
  setupExplorer: vi.fn(),
  setupVite: vi.fn(),
  setupWebhooks: vi.fn(),
}))

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<object>(),
  defineNuxtModule: (definition: unknown) => definition,
  createResolver: () => resolver,
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('#src/utils/log', () => ({ initLogger: () => logger, useLogger: () => logger }))

vi.mock('#src/setup/config', () => ({ default: setupSteps.setupConfig }))
vi.mock('#src/setup/analytics', () => ({ default: setupSteps.setupAnalytics }))
vi.mock('#src/setup/clients', () => ({ default: setupSteps.setupClients }))
vi.mock('#src/setup/codegen', () => ({ default: setupSteps.setupCodegen }))
vi.mock('#src/setup/graphql-config', () => ({ default: setupSteps.setupGraphqlConfig }))
vi.mock('#src/setup/graphql-transform', () => ({ default: setupSteps.setupGraphqlTransform }))
vi.mock('#src/setup/imports', () => ({ default: setupSteps.setupImports }))
vi.mock('#src/setup/explorer', () => ({ default: setupSteps.setupExplorer }))
vi.mock('#src/setup/vite', () => ({ default: setupSteps.setupVite }))
vi.mock('#src/setup/webhooks', () => ({ default: setupSteps.setupWebhooks }))

const { default: shopifyModule } = await import('#src/module') as unknown as { default: { setup: (options: object, nuxt: object) => Promise<void> } }

function createNuxt(options: Record<string, unknown> = {}) {
  return {
    options: { dev: false, _prepare: false, rootDir: '/tmp/shop', app: { baseURL: '/' }, ...options },
    callHook: vi.fn((_name: string, _payload?: unknown) => Promise.resolve()),
  }
}

const storefront = { apiVersion: API_VERSION, publicAccessToken: 'public-token' }

beforeEach(() => {
  vi.clearAllMocks()

  runtimeConfig.shopify = undefined
  runtimeConfig.public = {}
})

describe('module setup', () => {
  it('fails a build with an invalid configuration, naming the invalid option', async () => {
    await expect(shopifyModule.setup({ name: 'shop', clients: { storefront: { apiVersion: 'latest', publicAccessToken: 'public-token' } } }, createNuxt()))
      .rejects.toThrow(/Invalid module configuration[\s\S]*apiVersion/)

    expect(setupSteps.setupClients).not.toHaveBeenCalled()
  })

  it('sets up everything else in development when one feature is invalid, and says which it skipped', async () => {
    const nuxt = createNuxt({ dev: true })

    await shopifyModule.setup({ name: 'shop', clients: { storefront, admin: { apiVersion: API_VERSION } } }, nuxt)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Skipping `clients.admin`'))
    expect(setupSteps.setupClients).toHaveBeenCalledWith(nuxt, expect.objectContaining({ clients: { storefront: expect.objectContaining({ publicAccessToken: 'public-token' }) } }), expect.anything())
  })

  it('leaves a session password from the environment out of the build without calling it unrecognized', async () => {
    const password = 'p'.repeat(32)

    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = password

    try {
      await shopifyModule.setup({ name: 'shop', shopId: '1234', clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid', session: { password } } } }, createNuxt())
    }
    finally {
      delete process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD
    }

    const [, config] = setupSteps.setupClients.mock.calls[0] as [unknown, { clients: { customerAccount: { session: { password?: string } } } }]

    expect(config.clients.customerAccount.session.password).toBeUndefined()
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Unrecognized configuration value'))
  })

  it('treats an empty API version as unset, so the default applies', async () => {
    const nuxt = createNuxt()

    await shopifyModule.setup({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: '' } } }, nuxt)

    expect(setupSteps.setupClients).toHaveBeenCalledWith(nuxt, expect.objectContaining({ clients: { storefront: expect.objectContaining({ apiVersion: expect.stringMatching(/^\d{4}-\d{2}$/) }) } }), expect.anything())
  })

  it('keeps the empty API version declared in runtime config, so its environment variable still applies at runtime', async () => {
    const runtimeStorefront = { apiVersion: '', publicAccessToken: 'public-token' }

    runtimeConfig.shopify = { clients: { storefront: runtimeStorefront } }

    await shopifyModule.setup({ name: 'shop' }, createNuxt())

    expect(runtimeStorefront).toStrictEqual({ apiVersion: '', publicAccessToken: 'public-token' })
  })

  it('lets runtime config override the module options, and public runtime config override both', async () => {
    runtimeConfig.shopify = { name: 'private-shop', storefrontId: 'private' }
    runtimeConfig.public.shopify = { storefrontId: 'public' }

    const nuxt = createNuxt()

    await shopifyModule.setup({ name: 'options-shop', storefrontId: 'options', clients: { storefront } }, nuxt)

    expect(setupSteps.setupClients).toHaveBeenCalledWith(nuxt, expect.objectContaining({ name: 'private-shop', storefrontId: 'public' }), expect.anything())
  })

  it('hands the resolved config to the shopify:config and shopify:setup hooks', async () => {
    const nuxt = createNuxt()

    await shopifyModule.setup({ name: 'shop', clients: { storefront } }, nuxt)

    expect(nuxt.callHook.mock.calls.map(([name]) => name)).toEqual(['shopify:config', 'shopify:setup'])
    expect(nuxt.callHook).toHaveBeenCalledWith('shopify:setup', { nuxt, config: expect.objectContaining({ name: 'shop' }) })
  })

  it('skips setup without any configuration', async () => {
    await shopifyModule.setup({}, createNuxt())

    expect(logger.info).toHaveBeenCalledWith('Skipping setup: no module configuration provided')
    expect(setupSteps.setupClients).not.toHaveBeenCalled()
  })
})
