import type { CreateCartServerHandlersOptions, CreatePredictiveSearchServerHandlersOptions, I18nConfig, ShopifyRouteTemplates } from '@shopify/hydrogen'

import { CUSTOMER_ACCOUNT_API_VERSION } from '@shopify/hydrogen/customer-account'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { configObjectSchema, findInvalidFeatures, publicConfigSchema, withoutFeatures } from '#src/runtime/utils/config'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { API_VERSION } from '#test/helpers/api-version'

const storefront = { publicAccessToken: 'tok' }

function issues(input: unknown) {
  const result = configObjectSchema.safeParse(input)

  return result.success ? '' : z.prettifyError(result.error)
}

describe('shop name', () => {
  it('rejects a missing name', () => {
    expect(issues({ clients: { storefront } })).toContain('Shop name is required')
  })

  it('rejects an empty name', () => {
    expect(issues({ name: '', clients: { storefront } })).toContain('Shop name cannot be empty')
  })
})

describe('defaults', () => {
  const { clients } = configObjectSchema.parse({
    name: 'shop',
    clients: { storefront, admin: { accessToken: 'shpat_x' }, customerAccount: { clientId: 'cid' } },
  })

  it('parses a config without clients or route templates, keeping Shopify\'s standard paths', () => {
    const config = configObjectSchema.parse({ name: 'shop' })

    expect(config.clients).toStrictEqual({})
    expect(config.routeTemplates).toStrictEqual({})
  })

  it('fills in the documented global defaults, whether a block is omitted or empty', () => {
    const webhooks = { secret: 'secret', subscriptions: [{ uri: 'https://shop.example/webhooks/orders-create', topic: 'ORDERS_CREATE' }] }

    for (const blocks of [{}, { errors: {}, fragments: {}, graphql: {} }]) {
      expect(configObjectSchema.parse({ name: 'shop', ...blocks, webhooks })).toMatchObject({
        errors: { throw: true },
        fragments: { dirs: ['graphql'], autoImport: true },
        graphql: { generateConfig: true, normalize: true, injectFragments: true },
        webhooks: { subscriptions: [{ format: 'JSON' }] },
      })
    }
  })

  it('fills in the documented defaults for every client', () => {
    expect(clients).toMatchObject({
      storefront: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        codegen: { globalTypes: true },
        proxy: true,
        routes: true,
        cache: { server: { driver: 'lru-cache' } },
      },
      admin: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        codegen: { globalTypes: false },
        tokenStorage: { driver: 'memory' },
      },
      customerAccount: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        codegen: { globalTypes: false },
        proxy: true,
        afterLogin: '/',
        session: { name: '__Host-session', maxAge: 604800 },
      },
    })

    const customerAccount = configObjectSchema.parse({
      name: 'shop',
      clients: { customerAccount: { clientId: 'cid', afterLogin: '/account' } },
    }).clients.customerAccount

    expect(customerAccount?.afterLogout).toBeUndefined()
  })

  it('scans the documented default globs for every client, nitro route files included', () => {
    expect(clients.storefront?.documents).toStrictEqual([
      '**/*.{gql,graphql,ts,js,vue}',
      '!**/*.admin.{gql,graphql,ts,js}',
      '!**/admin.{gql,graphql,ts,js}',
      '!**/*.admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/admin/**/*.{gql,graphql,ts,js}',
      '!**/admin/*.{gql,graphql,ts,js}',
      '!**/*.customer-account.{gql,graphql,ts,js,vue}',
      '!**/customer-account.{gql,graphql,ts,js,vue}',
      '!**/*.customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer-account/**/*.{gql,graphql,ts,js,vue}',
      '!**/customer-account/*.{gql,graphql,ts,js,vue}',
      '!**/*.customer.{gql,graphql,ts,js,vue}',
      '!**/customer.{gql,graphql,ts,js,vue}',
      '!**/*.customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer/**/*.{gql,graphql,ts,js,vue}',
      '!**/customer/*.{gql,graphql,ts,js,vue}',
      '!**/*.account.{gql,graphql,ts,js,vue}',
      '!**/account.{gql,graphql,ts,js,vue}',
      '!**/*.account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/account/**/*.{gql,graphql,ts,js,vue}',
      '!**/account/*.{gql,graphql,ts,js,vue}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/.output/**',
      '!**/*.d.ts',
    ])

    expect(clients.admin?.documents).toStrictEqual([
      '**/*.admin.{gql,graphql,ts,js}',
      '**/admin.{gql,graphql,ts,js}',
      '**/*.admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/admin/**/*.{gql,graphql,ts,js}',
      '**/admin/*.{gql,graphql,ts,js}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/.output/**',
      '!**/*.d.ts',
    ])

    expect(clients.customerAccount?.documents).toStrictEqual([
      '**/*.customer-account.{gql,graphql,ts,js,vue}',
      '**/customer-account.{gql,graphql,ts,js,vue}',
      '**/*.customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer-account/**/*.{gql,graphql,ts,js,vue}',
      '**/customer-account/*.{gql,graphql,ts,js,vue}',
      '**/*.customer.{gql,graphql,ts,js,vue}',
      '**/customer.{gql,graphql,ts,js,vue}',
      '**/*.customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer/**/*.{gql,graphql,ts,js,vue}',
      '**/customer/*.{gql,graphql,ts,js,vue}',
      '**/*.account.{gql,graphql,ts,js,vue}',
      '**/account.{gql,graphql,ts,js,vue}',
      '**/*.account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/account/**/*.{gql,graphql,ts,js,vue}',
      '**/account/*.{gql,graphql,ts,js,vue}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/.output/**',
      '!**/*.d.ts',
    ])
  })
})

describe('api version', () => {
  it.each([
    [''],
    ['2026-1'],
    ['26-01'],
    ['latest'],
    [`../../admin/api/${API_VERSION}/graphql.json`],
    [`${API_VERSION}/../../admin`],
    [`x${API_VERSION}`],
  ])('names the malformed version %j in the error', (apiVersion) => {
    const message = issues({ name: 'shop', clients: { storefront: { ...storefront, apiVersion } } })

    expect(message).toContain(`Malformed API version "${apiVersion}"`)
    expect(message).not.toContain('[object Object]')
  })
})

describe('retries', () => {
  it('accepts the range the Shopify client supports', () => {
    for (const retries of [0, 1, 2, 3]) {
      expect(configObjectSchema.parse({ name: 'shop', clients: { storefront: { ...storefront, retries } } }).clients.storefront?.retries).toBe(retries)
    }
  })

  it('rejects values the Shopify client would throw on', () => {
    expect(configObjectSchema.safeParse({ name: 'shop', clients: { storefront: { ...storefront, retries: 4 } } }).success).toBe(false)
    expect(configObjectSchema.safeParse({ name: 'shop', clients: { storefront: { ...storefront, retries: -1 } } }).success).toBe(false)
    expect(configObjectSchema.safeParse({ name: 'shop', clients: { storefront: { ...storefront, retries: 1.5 } } }).success).toBe(false)
  })
})

describe('documents', () => {
  it.each([
    ['storefront', storefront],
    ['customerAccount', { clientId: 'cid' }],
    ['admin', { accessToken: 'shpat_x' }],
  ] as const)('keeps a configured %s document list, and still skips dependency and build folders and declaration files', (clientType, client) => {
    const config = configObjectSchema.parse({
      name: 'shop',
      clients: { [clientType]: { ...client, documents: ['app/graphql/**/*.ts', '!**/node_modules/**'] } },
    })

    expect(config.clients[clientType]?.documents).toStrictEqual([
      'app/graphql/**/*.ts',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/.output/**',
      '!**/*.d.ts',
    ])
  })
})

describe('public config', () => {
  it('carries only the options the browser reads, and never a server-only credential', () => {
    const config = publicConfigSchema.parse(configObjectSchema.parse({
      name: 'shop',
      origin: 'https://shop.example.com',
      shopId: '1',
      storefrontId: '2',
      defaultMarket: { country: 'DE', language: 'DE' },
      routeTemplates: { product: '/product/:productHandle' },
      cart: { fragment: '#graphql\n  fragment CartFragment on Cart { note }' },
      predictiveSearch: { limit: 8 },
      webhooks: { secret: 'webhook-secret' },
      clients: {
        storefront: {
          publicAccessToken: 'public-token',
          privateAccessToken: 'private-token',
          buyerIpHeader: 'x-real-ip',
          cache: { server: { driver: 'redis', url: 'redis://:cache-password@localhost' } },
        },
        customerAccount: {
          clientId: 'client-id',
          afterLogin: '/welcome',
          session: { name: 'session-cookie', password: 'superlongsessionpasswordwithatleast32chars' },
          tokenStorage: { driver: 'redis', url: 'redis://:token-password@localhost' },
        },
        admin: { accessToken: 'admin-token' },
      },
    }))

    expect(Object.keys(config).sort()).toStrictEqual(['analytics', 'clients', 'defaultMarket', 'errors', 'graphql', 'name', 'routeTemplates', 'shopId', 'storefrontId'])
    expect(Object.keys(config.clients).sort()).toStrictEqual(['customerAccount', 'storefront'])
    expect(Object.keys(config.clients.storefront!).sort()).toStrictEqual(['apiVersion', 'cache', 'proxy', 'publicAccessToken', 'retries'])
    expect(Object.keys(config.clients.customerAccount!).sort()).toStrictEqual(['apiVersion', 'clientId', 'proxy', 'retries'])
    expect(config.routeTemplates).toStrictEqual({ product: '/product/:productHandle' })
    expect(config.clients.storefront?.publicAccessToken).toBe('public-token')

    const exposed = JSON.stringify(config)

    for (const secret of ['private-token', 'superlongsessionpassword', 'admin-token', 'webhook-secret', 'cache-password', 'token-password']) {
      expect(exposed).not.toContain(secret)
    }
  })
})

describe('enableable options', () => {
  it('resolves `true` to the default option object', () => {
    const config = configObjectSchema.parse({ name: 'shop', clients: { storefront: { ...storefront, cache: true } } })

    expect(config.clients.storefront?.cache).toMatchObject({ browser: { ttl: 10 } })
  })

  it('keeps `false` as an explicit opt-out', () => {
    const config = configObjectSchema.parse({ name: 'shop', clients: { storefront: { ...storefront, cache: false, proxy: false } } })

    expect(config.clients.storefront?.cache).toBe(false)
    expect(config.clients.storefront?.proxy).toBe(false)
  })

  it('accepts a storage mount name as a string', () => {
    const config = configObjectSchema.parse({
      name: 'shop',
      clients: { admin: { accessToken: 'shpat_x', tokenStorage: 'redis' } },
    })

    expect(config.clients.admin?.tokenStorage).toBe('redis')
  })
})

describe('cache presets', () => {
  const presetsFor = (presets?: Record<string, unknown>) => configObjectSchema.parse({
    name: 'shop',
    clients: { storefront: { ...storefront, ...(presets ? { cache: { presets } } : {}) } },
  }).clients.storefront!.cache

  it('ships `short` and `long` out of the box', () => {
    const cache = presetsFor()

    expect(cache && cache.presets).toStrictEqual({
      short: { maxAge: 1, staleWhileRevalidate: 9 },
      long: { maxAge: 3600, staleWhileRevalidate: 82800 },
    })
  })

  it('replaces the built-in presets with the configured ones', () => {
    const cache = presetsFor({ tiny: { maxAge: 2, staleWhileRevalidate: 4 } })

    expect(Object.keys((cache && cache.presets) ?? {})).toStrictEqual(['tiny'])
  })

  it('takes a configured preset verbatim', () => {
    const cache = presetsFor({ short: { maxAge: { minutes: 1 }, staleIfError: 30 } })

    expect(cache && cache.presets.short).toStrictEqual({ maxAge: { minutes: 1 }, staleIfError: 30 })
  })
})

describe('customer account session cookie', () => {
  it('only takes `sameSite`, since a `__Host-` cookie needs `Secure`, the root path and no domain', () => {
    const session = configObjectSchema.parse({
      name: 'shop',
      clients: { customerAccount: { clientId: 'cid', session: { cookie: { domain: 'shop.example.com', path: '/account', secure: false, sameSite: 'none' } } } },
    }).clients.customerAccount?.session

    expect(session?.cookie).toStrictEqual({ sameSite: 'none' })
    expectTypeOf<keyof NonNullable<NonNullable<NonNullable<NonNullable<z.input<typeof configObjectSchema>['clients']>['customerAccount']>['session']>['cookie']>>()
      .toEqualTypeOf<'sameSite'>()
  })

  it('refuses `strict`, because the browser then drops the cookie when Shopify sends the customer back and sign-in fails', () => {
    expect(issues({ name: 'shop', clients: { customerAccount: { clientId: 'cid', session: { cookie: { sameSite: 'strict' } } } } }))
      .toContain('sign-in fails')
  })
})

describe('customer account client id', () => {
  it('accepts a customer account block without a client id at the type level', () => {
    expectTypeOf({ name: 'shop', clients: { storefront, customerAccount: { afterLogin: '/account' } } })
      .toExtend<z.input<typeof configObjectSchema>>()
  })

  it.each([
    ['without a client id', { afterLogin: '/account' }],
    ['with an empty client id', { clientId: '' }],
  ])('still refuses to parse a customer account client %s', (_, customerAccount) => {
    expect(issues({ name: 'shop', clients: { storefront, customerAccount } }))
      .toContain('Client ID is required for the customer account client')
  })
})

describe('route templates', () => {
  it('types the templates as Hydrogen\'s', () => {
    expectTypeOf<z.input<typeof configObjectSchema>['routeTemplates']>().toEqualTypeOf<ShopifyRouteTemplates | undefined>()
  })
})

describe('origin', () => {
  it.each(['', 'https://shop.example.com', 'http://localhost:3000'])('accepts %j', (origin) => {
    expect(configObjectSchema.parse({ name: 'shop', origin }).origin).toBe(origin)
  })

  it.each(['shop.example.com', 'ftp://shop.example.com', '/shop'])('rejects %j instead of failing every request', (origin) => {
    expect(issues({ name: 'shop', origin })).toContain('origin')
  })
})

describe('shop ID', () => {
  it.each([['', ''], ['70371508303', '70371508303'], [70371508303, '70371508303']])('accepts %j', (shopId, expected) => {
    expect(configObjectSchema.parse({ name: 'shop', shopId }).shopId).toBe(expected)
  })

  it.each(['gid://shopify/Shop/1', 'shop', '12 34'])('rejects %j, since customer accounts need the numeric ID', (shopId) => {
    expect(issues({ name: 'shop', shopId })).toContain('shopId')
  })
})

describe('storefront ID', () => {
  it('turns a numeric ID into a string', () => {
    expect(configObjectSchema.parse({ name: 'shop', storefrontId: 1234567 }).storefrontId).toBe('1234567')
  })
})

describe('default market', () => {
  type DefaultMarket = NonNullable<z.input<typeof configObjectSchema>['defaultMarket']>

  it('types the codes with Hydrogen\'s, so the editor suggests them, and keeps the empty placeholder', () => {
    expectTypeOf<DefaultMarket['country']>().toEqualTypeOf<I18nConfig['country'] | ''>()
    expectTypeOf<DefaultMarket['language']>().toEqualTypeOf<I18nConfig['language'] | ''>()
  })

  it('takes the market in Shopify\'s uppercase codes', () => {
    expect(configObjectSchema.parse({ name: 'shop', defaultMarket: { country: 'de', language: 'de', currency: 'eur' } }).defaultMarket)
      .toStrictEqual({ country: 'DE', language: 'DE', currency: 'EUR' })
  })

  it('needs both a country and a language for the market', () => {
    expect(configObjectSchema.safeParse({ name: 'shop', defaultMarket: { country: 'DE' } }).success).toBe(false)
  })
})

describe('default api version', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('follows the installed Hydrogen, so a rebuild in a later quarter keeps the version', async () => {
    const [year, month] = CUSTOMER_ACCOUNT_API_VERSION.split('-')

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${Number(year) + 1}-${month}-15T00:00:00Z`))
    vi.resetModules()

    const { configObjectSchema: schema } = await import('#src/runtime/utils/config')

    const { clients } = schema.parse({
      name: 'shop',
      clients: { storefront, admin: { accessToken: 'shpat_x' }, customerAccount: { clientId: 'cid' } },
    })

    expect([clients.storefront?.apiVersion, clients.admin?.apiVersion, clients.customerAccount?.apiVersion])
      .toStrictEqual([CUSTOMER_ACCOUNT_API_VERSION, CUSTOMER_ACCOUNT_API_VERSION, CUSTOMER_ACCOUNT_API_VERSION])
  })
})

describe('cache preset validation', () => {
  const parsePreset = (preset: unknown) => configObjectSchema.safeParse({ name: 'shop', clients: { storefront: { ...storefront, cache: { presets: { custom: preset } } } } })

  it.each([
    [{ maxAge: -1 }],
    [{ maxAge: { minutes: -1 } }],
    [{ maxAge: '1h' }],
    [{ maxAge: { weeks: 1 } }],
    [{ staleWhileRevalidate: Number.POSITIVE_INFINITY }],
    [{ mode: 'no-store' }],
  ])('rejects %j, which Hydrogen\'s Cache() throws on or turns into 0', (preset) => {
    expect(parsePreset(preset).success).toBe(false)
  })

  it.each([
    [{ mode: 'public', maxAge: 60 }],
    [{ mode: 'private', maxAge: { hours: 1 }, staleWhileRevalidate: { days: 1, hours: 2 } }],
    [{ staleIfError: 0 }],
  ])('accepts %j', (preset) => {
    expect(parsePreset(preset).success).toBe(true)
  })
})

describe('Hydrogen handler options', () => {
  const cart = { fragment: '#graphql\n  fragment CartFragment on Cart { note }' }
  const predictiveSearch = { limit: 8, limitScope: 'ALL', types: ['PRODUCT', 'QUERY'], unavailableProducts: 'LAST', fragments: { product: 'fragment PredictiveSearchProductFragment on Product { vendor }' } }

  it('keeps the cart and predictive search options for Hydrogen\'s handlers', () => {
    const config = configObjectSchema.parse({ name: 'shop', clients: { storefront }, cart, predictiveSearch })

    expect(config.cart).toStrictEqual(cart)
    expect(config.predictiveSearch).toStrictEqual(predictiveSearch)
  })

  it('types the options as Hydrogen\'s, without the parts the module owns', () => {
    expectTypeOf<NonNullable<z.input<typeof configObjectSchema>['cart']>>().toEqualTypeOf<Pick<CreateCartServerHandlersOptions, 'fragment'>>()
    expectTypeOf<NonNullable<z.input<typeof configObjectSchema>['predictiveSearch']>>().toEqualTypeOf<Omit<CreatePredictiveSearchServerHandlersOptions, 'path'>>()
  })

  it('refuses a predictive search path, since the route is always served at Hydrogen\'s default path', () => {
    expect(issues({ name: 'shop', clients: { storefront }, predictiveSearch: { path: '/api/search' } })).toContain('/api/predictive-search')
  })

  it('reports a fragment Hydrogen refuses, by Hydrogen\'s own message', () => {
    expect(issues({ name: 'shop', clients: { storefront }, cart: { fragment: 'fragment Other on Cart { note }' } })).toContain('CartFragment')
  })
})

describe('analytics', () => {
  const parseAnalytics = (analytics?: unknown) => configObjectSchema.parse({
    name: 'shop',
    clients: { storefront },
    ...(analytics === undefined ? {} : { analytics }),
  }).analytics

  it('is disabled by default', () => {
    expect(parseAnalytics()).toBe(false)
  })

  it.each([
    ['`true`', true],
    ['an empty config object', {}],
    ['a consent without a mode', { consent: {} }],
  ])('turns %s into the default config, which loads no banner', (_, analytics) => {
    expect(parseAnalytics(analytics)).toStrictEqual({ autoPageView: true, consent: { mode: 'no-banner' } })
  })

  it('accepts Shopify\'s consent modes only', () => {
    expect(parseAnalytics({ consent: { mode: 'custom-banner' } })).toMatchObject({ consent: { mode: 'custom-banner' } })
    expect(() => parseAnalytics({ consent: { mode: 'banner' } })).toThrow()
  })
})

describe('storefront routes', () => {
  it('turns the Storefront API proxy off with the routes, so the browser client calls Shopify directly', () => {
    for (const proxy of [undefined, true]) {
      const config = configObjectSchema.parse({ name: 'shop', clients: { storefront: { ...storefront, routes: false, proxy } } })

      expect(config.clients.storefront).toMatchObject({ routes: false, proxy: false })
    }
  })

  it('leaves out analytics, which needs Shopify\'s routes and scripts, when the storefront client turns its routes off', () => {
    const input = { name: 'shop', clients: { storefront: { ...storefront, routes: false } }, analytics: true }
    const parsed = configObjectSchema.safeParse(input)

    expect(findInvalidFeatures(parsed.error!)).toStrictEqual([['analytics']])
    expect(parsed.error?.issues[0]?.message).toContain('`clients.storefront.routes`')
    expect(configObjectSchema.safeParse(withoutFeatures(input, [['analytics']]))).toMatchObject({ success: true })
  })

  it('reports the conflict together with other invalid features, so the rest of the module still sets up', () => {
    const input = { name: 'shop', clients: { storefront: { ...storefront, routes: false }, admin: { clientId: 'id' } }, analytics: true }
    const parsed = configObjectSchema.safeParse(input)
    const features = findInvalidFeatures(parsed.error!)!

    expect(features.map(feature => feature.join('.')).sort()).toStrictEqual(['analytics', 'clients.admin'])
    expect(configObjectSchema.safeParse(withoutFeatures(input, features))).toMatchObject({ success: true })
  })
})

describe('customer account token storage', () => {
  const parseTokenStorage = (tokenStorage?: unknown) => configObjectSchema.parse({
    name: 'shop',
    clients: {
      customerAccount: {
        clientId: 'client-id',
        ...(tokenStorage === undefined ? {} : { tokenStorage }),
      },
    },
  }).clients.customerAccount?.tokenStorage

  it.each([
    ['no option as cookie mode, keeping the tokens in the session cookie', undefined, false],
    ['`true` as a bounded number of sessions in memory', true, { driver: 'lru-cache', max: 10_000 }],
    ['an external storage mount', { driver: 'redis', url: 'redis://localhost' }, { driver: 'redis', url: 'redis://localhost' }],
    ['the name of a storage mount', 'customer-account-token', 'customer-account-token'],
  ])('takes %s', (_, tokenStorage, expected) => {
    expect(parseTokenStorage(tokenStorage)).toStrictEqual(expected)
  })
})

describe('baked config', () => {
  it('re-parses to an identical config', () => {
    const baked = configObjectSchema.parse({
      name: 'test-shop',
      shopId: '1',
      storefrontId: '187932',
      clients: {
        storefront: { publicAccessToken: 'public-token', privateAccessToken: 'private-token' },
        customerAccount: { clientId: 'client-id', apiVersion: API_VERSION },
        admin: { accessToken: 'admin-token' },
      },
    })

    expect(configObjectSchema.parse(baked)).toEqual(baked)
  })
})

describe('invalid features', () => {
  it('names the feature of every invalid option, so only those can be left out', () => {
    const input = {
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'public' }, admin: { clientId: 'id' }, customerAccount: { clientId: 'cid', proxy: { route: '/_proxy/customer-account' } } },
      webhooks: { subscriptions: [{ topic: 'ORDERS_CREATE' }] },
    }

    const parsed = configObjectSchema.safeParse(input)

    expect(parsed.success).toBe(false)

    const features = findInvalidFeatures(parsed.error!)!

    expect(features.map(feature => feature.join('.')).sort()).toStrictEqual(['clients.admin', 'clients.customerAccount', 'webhooks'])

    const remaining = withoutFeatures(input, features)

    expect(remaining).toStrictEqual({ name: 'shop', clients: { storefront: { publicAccessToken: 'public' } } })
    expect(input.clients).toHaveProperty('admin')
    expect(configObjectSchema.safeParse(remaining)).toMatchObject({ success: true })
  })

  it('can\'t leave out an invalid shop name', () => {
    const parsed = configObjectSchema.safeParse({ name: '', clients: { admin: { clientId: 'id' } } })

    expect(findInvalidFeatures(parsed.error!)).toBeUndefined()
  })

  it('explains that the proxy routes are fixed when a 1.x proxy route is configured', () => {
    const parsed = configObjectSchema.safeParse({ name: 'shop', clients: { customerAccount: { clientId: 'cid', proxy: { route: '/_proxy/customer-account' } } } })

    expect(parsed.error?.issues[0]?.message).toContain('/account/customer/api/<version>/graphql')
  })
})
