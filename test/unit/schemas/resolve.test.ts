import type { Nuxt } from '@nuxt/schema'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createLoggerStub } from '#test/helpers/logger'

const persisted: Array<[string, string]> = []

const warnings: string[] = []

const infos: string[] = []

let persists = true

vi.mock('#src/utils/log', () => ({
  initLogger: () => undefined,
  useLogger: () => createLoggerStub({
    warn: (message: string) => void warnings.push(message),
    info: (message: string) => void infos.push(message),
  }),
}))

vi.mock('#src/utils/session', async importOriginal => ({
  ...await importOriginal<typeof import('#src/utils/session')>(),
  persistSessionPassword: (rootDir: string, password: string) => {
    persisted.push([rootDir, password])

    return Promise.resolve(persists)
  },
}))

const { configObjectSchema, publicConfigSchema } = await import('#src/schemas')
const { resolveConfig, warnPublicOptions, warnUnrecognizedOptions } = await import('#src/schemas/resolve')

const API_URL = `https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`

function nuxtStub(options: Record<string, unknown> = {}) {
  return { options: { ssr: true, dev: false, rootDir: '/tmp/shop', app: { baseURL: '/' }, ...options } } as unknown as Nuxt
}

async function resolve(input: Record<string, unknown>, nuxt = nuxtStub()) {
  const config = await resolveConfig(configObjectSchema.parse(input), nuxt)

  return { config, publicConfig: publicConfigSchema.parse(config) }
}

function warnUnrecognized(input: Record<string, unknown>) {
  warnUnrecognizedOptions(input, configObjectSchema.parse(input))
}

const storefront = { publicAccessToken: 'tok' }

beforeEach(() => {
  persisted.length = 0
  warnings.length = 0
  infos.length = 0
  persists = true

  delete process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD

  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ graphql_api: API_URL }) })))
})

describe('analytics', () => {
  it('keeps analytics without a public storefront token', async () => {
    const { config } = await resolve({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: true,
    })

    expect(config.analytics).not.toBe(false)
  })
})

describe('app base URL', () => {
  it('warns that Shopify\'s routes only work at the domain root, for every feature that needs them', async () => {
    for (const input of [
      { name: 'shop', clients: { storefront } },
      { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } },
      { name: 'shop', analytics: true },
    ]) {
      warnings.length = 0

      await resolve(input, nuxtStub({ app: { baseURL: '/shop/' } }))

      expect(warnings).toContainEqual(expect.stringContaining('`app.baseURL` is `/shop/`'))
    }
  })

  it('stays quiet at the domain root, and for an admin client, which has no browser routes', async () => {
    await resolve({ name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } }, analytics: true })
    await resolve({ name: 'shop', clients: { admin: { accessToken: 'shpat_x' } } }, nuxtStub({ app: { baseURL: '/shop/' } }))

    expect(warnings.filter(warning => warning.includes('app.baseURL'))).toEqual([])
  })
})

describe('proxy requires a server', () => {
  const input = { name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } } }

  it('keeps the proxies even when ssr is off', async () => {
    const { config, publicConfig } = await resolve(input, nuxtStub({ ssr: false }))

    expect(config.clients.storefront?.proxy).toBe(true)
    expect(config.clients.customerAccount?.proxy).toBe(true)
    expect(publicConfig.clients.storefront?.proxy).toBe(true)
    expect(publicConfig.clients.customerAccount?.proxy).toBe(true)
  })
})

describe('customer account proxy opt-out', () => {
  it('warns that the browser client cannot authenticate without the proxy', async () => {
    await resolve({ name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid', proxy: false } } })

    const message = warnings.join('\n')

    expect(message).toContain('customer account proxy is disabled')
    expect(message).toContain('useCustomerAccount()')
  })

  it.each([
    ['while the proxy is enabled', { storefront, customerAccount: { clientId: 'cid' } }],
    ['when the storefront proxy alone is disabled', { storefront: { ...storefront, proxy: false } }],
  ])('stays quiet %s', async (_, clients) => {
    await resolve({ name: 'shop', clients })

    expect(warnings.join('\n')).not.toContain('customer account proxy is disabled')
  })
})

describe('shop id', () => {
  const input = { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } }

  it('looks up the shop ID from the well-known endpoint into both configs', async () => {
    const { config, publicConfig } = await resolve(input)

    expect(fetch).toHaveBeenCalledWith('https://shop.myshopify.com/.well-known/customer-account-api', { signal: expect.any(AbortSignal) })
    expect(config.shopId).toBe('1234')
    expect(publicConfig.shopId).toBe('1234')
  })

  it('leaves the shop ID unset and says how to set it when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    const { config } = await resolve(input)

    expect(config.shopId).toBeUndefined()
    expect(warnings.join('\n')).toContain('`shopId`')
  })
})

describe('customer account session password', () => {
  const input = { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } }

  it('uses the environment variable in development, even over a short configured password', async () => {
    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = 'x'.repeat(48)

    const { config } = await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', session: { password: 'short' } } } }, nuxtStub({ dev: true }))

    expect(config.clients.customerAccount?.session.password).toBe('x'.repeat(48))
    expect(persisted).toHaveLength(0)
  })

  it('leaves the environment password out of a production build, for the server to read at runtime', async () => {
    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = 'x'.repeat(48)

    const { config } = await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', session: { password: 'x'.repeat(48) } } } })

    expect(config.clients.customerAccount?.session.password).toBeUndefined()
    expect(warnings).toEqual([])
  })

  it('keeps a password set in the config of a production build', async () => {
    const { config } = await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', session: { password: 'y'.repeat(48) } } } })

    expect(config.clients.customerAccount?.session.password).toBe('y'.repeat(48))
  })

  it('generates and persists one in development, and says where it went', async () => {
    const { config } = await resolve(input, nuxtStub({ dev: true }))

    const password = config.clients.customerAccount?.session.password

    expect(password).toBeTruthy()
    expect(persisted).toEqual([['/tmp/shop', password]])
    expect(infos).toContainEqual(expect.stringContaining('Generated a customer account session password in `.env`'))
    expect(warnings).toEqual([])
  })

  it('never generates one in production, and warns that sign-in fails without one at runtime', async () => {
    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.session.password).toBeUndefined()
    expect(persisted).toHaveLength(0)
    expect(warnings).toContainEqual(expect.stringContaining('No customer account session password set at build time'))
  })

  it('warns that a generated password only lasts this run when `.env` keeps one that isn\'t loaded', async () => {
    persists = false

    await resolve(input, nuxtStub({ dev: true }))

    expect(warnings).toContainEqual(expect.stringContaining('for this run only'))
  })

  it.each([
    ['too short', 'short-password'],
    ['the example value', 'A_RANDOM_32_CHARACTER_OR_LONGER_SECRET'],
  ])('replaces a password that is %s with a generated one in development', async (_, unusable) => {
    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = unusable

    const { config } = await resolve(input, nuxtStub({ dev: true }))

    const password = config.clients.customerAccount?.session.password

    expect(password).not.toBe(unusable)
    expect(password!.length).toBeGreaterThanOrEqual(32)
    expect(persisted).toEqual([['/tmp/shop', password]])
  })

  it('drops an unusable password in production and warns', async () => {
    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = 'A_RANDOM_32_CHARACTER_OR_LONGER_SECRET'

    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.session.password).toBeUndefined()
    expect(warnings).toContainEqual(expect.stringContaining('at least 32 characters'))
  })

  it('stays quiet while preparing types, which deploys nothing', async () => {
    const { config } = await resolve(input, nuxtStub({ _prepare: true }))

    expect(config.clients.customerAccount?.session.password).toBeUndefined()
    expect(warnings).toEqual([])
    expect(persisted).toHaveLength(0)
  })
})

describe('api version window', () => {
  it('warns about a version that left the supported window without failing the build, naming the client that carries it', async () => {
    const { config } = await resolve({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: '2020-01' }, customerAccount: { clientId: 'cid', apiVersion: '2020-01' } } })

    const message = warnings.join('\n')

    expect(config.clients.storefront?.apiVersion).toBe('2020-01')
    expect(message).toContain('`2020-01`')
    expect(message).toContain('outside the window')
    expect(message).toContain(API_VERSION)
    expect(message).toContain('storefront client')
    expect(message).toContain('customer-account client')
  })

  it('stays quiet for a version inside the window', async () => {
    const { config } = await resolve({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: API_VERSION } } })

    expect(config.clients.storefront?.apiVersion).toBe(API_VERSION)
    expect(warnings.join('\n')).not.toContain('outside the window')
  })
})

describe('unrecognized configuration values', () => {
  it('warns about every option the module does not know, with its path', async () => {
    warnUnrecognized({
      name: 'shop',
      domain: 'shop.example.com',
      clients: { storefront: { publicAccessToken: 'tok', cache: { proxy: false } } },
      analytics: { consent: { banner: true } },
    })

    expect(warnings).toEqual([
      expect.stringContaining('`shopify.domain`'),
      expect.stringContaining('`shopify.clients.storefront.cache.proxy`'),
      expect.stringContaining('`shopify.analytics.consent.banner`'),
    ])
  })

  it('looks into arrays and cache presets, where 1.x keys would otherwise vanish', async () => {
    warnUnrecognized({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'tok', cache: { presets: { long: { maxAge: 60, staleMaxAge: 600, swr: true } } } } },
      webhooks: { secret: 'secret', subscriptions: [{ uri: 'https://shop.example/hook', topic: 'ORDERS_CREATE', metafeilds: [] }] },
      analytics: { country: 'US' },
    })

    expect(warnings).toEqual([
      expect.stringContaining('`shopify.clients.storefront.cache.presets.long.staleMaxAge`'),
      expect.stringContaining('`shopify.clients.storefront.cache.presets.long.swr`'),
      expect.stringContaining('`shopify.webhooks.subscriptions.0.metafeilds`'),
      expect.stringContaining('`shopify.analytics.country`'),
    ])
  })

  it('leaves options the module passes through unchanged alone, even when they reference themselves', async () => {
    const reporter: Record<string, unknown> = { log: () => undefined }

    reporter.self = reporter

    expect(() => warnUnrecognized({ name: 'shop', logger: { reporters: [reporter] } })).not.toThrow()
    expect(warnings).toEqual([])
  })

  it('stays quiet for a valid configuration, free-form values included', async () => {
    warnUnrecognized({
      name: 'shop',
      routeTemplates: { product: '/p/:productHandle' },
      logger: { level: 3 },
      clients: {
        storefront: {
          publicAccessToken: 'tok',
          headers: { 'X-Custom': '1' },
          codegen: true,
          cache: { server: { driver: 'redis', host: 'localhost' }, presets: { custom: { maxAge: { minutes: 5 }, staleIfError: 60 } } },
          documents: ['**/*.storefront.ts'],
        },
      },
      webhooks: { secret: 'secret', subscriptions: [{ uri: 'https://shop.example/hook', topic: 'ORDERS_CREATE', metafields: [{ key: 'a' }] }] },
      shopId: 1,
      defaultMarket: { country: 'US', language: 'EN' },
      analytics: true,
    })

    expect(warnings).toEqual([])
  })
})

describe('options that would reach the browser', () => {
  it('warns about every private option set under runtimeConfig.public.shopify', async () => {
    const publicInput = {
      name: 'shop',
      origin: 'https://shop.example.com',
      clients: { storefront: { publicAccessToken: 'public', privateAccessToken: 'private' }, admin: { accessToken: 'shpat_x' } },
      webhooks: { secret: 'secret' },
    }

    const { config } = await resolve(publicInput)

    warnPublicOptions(publicInput, config)

    expect(warnings).toEqual([
      expect.stringContaining('`runtimeConfig.public.shopify.origin`'),
      expect.stringContaining('`runtimeConfig.public.shopify.clients.storefront.privateAccessToken`'),
      expect.stringContaining('`runtimeConfig.public.shopify.clients.admin`'),
      expect.stringContaining('`runtimeConfig.public.shopify.webhooks`'),
    ])
  })

  it('stays quiet for public options and for typos, which the unrecognized option warning names', async () => {
    const publicInput = { name: 'shop', storefrontId: '1', clients: { storefront: { publicAccessToken: 'public', proxi: true } } }

    const { config } = await resolve(publicInput)

    warnPublicOptions(publicInput, config)

    expect(warnings).toEqual([])
  })
})
