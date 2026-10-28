import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { configObjectSchema, publicConfigSchema } from '#src/schemas'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { SESSION_DEFAULT_NAME } from '#src/runtime/utils/session'
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

describe('clients', () => {
  it('parses without a clients block', () => {
    const config = configObjectSchema.parse({ name: 'shop' })

    expect(config.clients).toStrictEqual({})
  })
})

describe('defaults', () => {
  const { clients } = configObjectSchema.parse({
    name: 'shop',
    clients: { storefront, admin: { accessToken: 'shpat_x' }, customerAccount: { clientId: 'cid' } },
  })

  it('fills in the documented global defaults, whether a block is omitted or empty', () => {
    const webhooks = { secret: 'secret', hooks: [{ uri: 'https://shop.example/webhooks/orders-create', topic: 'ORDERS_CREATE' }] }

    for (const blocks of [{}, { errors: {}, fragments: {}, graphql: {} }]) {
      expect(configObjectSchema.parse({ name: 'shop', ...blocks, webhooks })).toMatchObject({
        errors: { throw: true },
        fragments: { dirs: ['graphql'], autoImport: true },
        graphql: { generateConfig: true, normalize: true, injectFragments: true },
        webhooks: { hooks: [{ format: 'JSON' }] },
      })
    }
  })

  it('fills in the documented defaults for every client', () => {
    expect(clients).toMatchObject({
      storefront: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        codegen: { autoImport: true },
        cache: { proxy: { driver: 'lru-cache' } },
      },
      admin: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        tokenStorage: { driver: 'memory' },
      },
      customerAccount: {
        apiVersion: DEFAULT_API_VERSION,
        retries: 0,
        explorer: true,
        codegen: { autoImport: false },
        scope: ['openid', 'email', 'customer-account-api:full'],
        routes: {
          callback: '_auth/customer-account/callback',
          logout: '_auth/customer-account/logout',
          session: '_auth/customer-account/session',
        },
        afterLogin: '/',
        session: { name: 'shopify-customer-account', maxAge: 604800 },
        dev: { bridgeURL: '_auth/customer-account/bridge' },
      },
    })

    const customerAccount = configObjectSchema.parse({
      name: 'shop',
      clients: { customerAccount: { clientId: 'cid', afterLogin: '/account' } },
    }).clients.customerAccount

    expect(customerAccount?.afterLogout).toBe('/account')
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
      '!**/(admin)/**/*.{gql,graphql,ts,js}',
      '!**/(admin)/*.{gql,graphql,ts,js}',
      '!**/*.customer-account.{gql,graphql,ts,js,vue}',
      '!**/customer-account.{gql,graphql,ts,js,vue}',
      '!**/*.customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer-account/**/*.{gql,graphql,ts,js,vue}',
      '!**/customer-account/*.{gql,graphql,ts,js,vue}',
      '!**/(customer-account)/**/*.{gql,graphql,ts,js,vue}',
      '!**/(customer-account)/*.{gql,graphql,ts,js,vue}',
      '!**/*.customer.{gql,graphql,ts,js,vue}',
      '!**/customer.{gql,graphql,ts,js,vue}',
      '!**/*.customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/customer/**/*.{gql,graphql,ts,js,vue}',
      '!**/customer/*.{gql,graphql,ts,js,vue}',
      '!**/(customer)/**/*.{gql,graphql,ts,js,vue}',
      '!**/(customer)/*.{gql,graphql,ts,js,vue}',
      '!**/*.account.{gql,graphql,ts,js,vue}',
      '!**/account.{gql,graphql,ts,js,vue}',
      '!**/*.account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '!**/account/**/*.{gql,graphql,ts,js,vue}',
      '!**/account/*.{gql,graphql,ts,js,vue}',
      '!**/(account)/**/*.{gql,graphql,ts,js,vue}',
      '!**/(account)/*.{gql,graphql,ts,js,vue}',
      '!node_modules',
      '!dist',
      '!.nuxt',
      '!.output',
    ])

    expect(clients.admin?.documents).toStrictEqual([
      '**/*.admin.{gql,graphql,ts,js}',
      '**/admin.{gql,graphql,ts,js}',
      '**/*.admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/admin.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/admin/**/*.{gql,graphql,ts,js}',
      '**/admin/*.{gql,graphql,ts,js}',
      '**/(admin)/**/*.{gql,graphql,ts,js}',
      '**/(admin)/*.{gql,graphql,ts,js}',
      '!node_modules',
      '!dist',
      '!.nuxt',
      '!.output',
    ])

    expect(clients.customerAccount?.documents).toStrictEqual([
      '**/*.customer-account.{gql,graphql,ts,js,vue}',
      '**/customer-account.{gql,graphql,ts,js,vue}',
      '**/*.customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer-account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer-account/**/*.{gql,graphql,ts,js,vue}',
      '**/customer-account/*.{gql,graphql,ts,js,vue}',
      '**/(customer-account)/**/*.{gql,graphql,ts,js,vue}',
      '**/(customer-account)/*.{gql,graphql,ts,js,vue}',
      '**/*.customer.{gql,graphql,ts,js,vue}',
      '**/customer.{gql,graphql,ts,js,vue}',
      '**/*.customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/customer/**/*.{gql,graphql,ts,js,vue}',
      '**/customer/*.{gql,graphql,ts,js,vue}',
      '**/(customer)/**/*.{gql,graphql,ts,js,vue}',
      '**/(customer)/*.{gql,graphql,ts,js,vue}',
      '**/*.account.{gql,graphql,ts,js,vue}',
      '**/account.{gql,graphql,ts,js,vue}',
      '**/*.account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/account.{connect,delete,get,head,options,patch,post,put,trace}.{ts,js}',
      '**/account/**/*.{gql,graphql,ts,js,vue}',
      '**/account/*.{gql,graphql,ts,js,vue}',
      '**/(account)/**/*.{gql,graphql,ts,js,vue}',
      '**/(account)/*.{gql,graphql,ts,js,vue}',
      '!node_modules',
      '!dist',
      '!.nuxt',
      '!.output',
    ])
  })
})

describe('api version', () => {
  it.each([
    ['2026-1'],
    ['26-01'],
    ['latest'],
    [`../../admin/api/${API_VERSION}/graphql.json`],
    [`${API_VERSION}/../../admin`],
    [`x${API_VERSION}`],
  ])('names the malformed version %s in the error', (apiVersion) => {
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

describe('storefront documents', () => {
  it('keeps a configured document list as given', () => {
    const config = configObjectSchema.parse({
      name: 'shop',
      clients: { storefront: { ...storefront, documents: ['app/graphql/**/*.ts'] } },
    })

    expect(config.clients.storefront?.documents).toStrictEqual(['app/graphql/**/*.ts'])
  })
})

describe('public config', () => {
  it('carries the public token, never a server-only credential of any client', () => {
    const config = publicConfigSchema.parse(configObjectSchema.parse({
      name: 'shop',
      clients: {
        storefront: { publicAccessToken: 'public-token', privateAccessToken: 'private-token' },
        customerAccount: { clientId: 'client-id', clientSecret: 'client-secret' },
        admin: { accessToken: 'admin-token' },
      },
    }))

    const exposed = JSON.stringify(config)

    expect(exposed).toContain('public-token')
    expect(config.clients.storefront).not.toHaveProperty('privateAccessToken')

    for (const secret of ['private-token', 'client-secret', 'admin-token']) {
      expect(exposed).not.toContain(secret)
    }
  })

  it('carries only the session cookie name, never customer account secrets', () => {
    const config = publicConfigSchema.parse({
      name: 'shop',
      clients: {
        customerAccount: {
          clientId: 'cid',
          clientSecret: 'secret',
          session: { password: 'superlongsessionpasswordwithatleast32chars' },
        },
      },
    })

    expect(config.clients.customerAccount).not.toHaveProperty('clientSecret')
    expect(config.clients.customerAccount?.session).toStrictEqual({ name: SESSION_DEFAULT_NAME })
    expect(JSON.stringify(config)).not.toContain('secret')
    expect(JSON.stringify(config)).not.toContain('superlongsessionpassword')
  })
})

describe('enableable options', () => {
  it('resolves `true` to the default option object', () => {
    const config = configObjectSchema.parse({ name: 'shop', clients: { storefront: { ...storefront, cache: true } } })

    expect(config.clients.storefront?.cache).toMatchObject({ client: { ttl: 10_000 } })
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

  it('does not declare admin operation types globally by default', () => {
    expect(configObjectSchema.parse({ name: 'shop', clients: { admin: { accessToken: 'shpat_x' } } }).clients.admin?.codegen).toMatchObject({ autoImport: false })
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
      short: { maxAge: 1, staleMaxAge: 9, swr: true },
      long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
    })
  })

  it('replaces the built-in presets with the configured ones', () => {
    const cache = presetsFor({ tiny: { maxAge: 2, staleMaxAge: 4, swr: true } })

    expect(Object.keys((cache && cache.presets) ?? {})).toStrictEqual(['tiny'])
  })

  it('takes a configured preset verbatim', () => {
    const cache = presetsFor({ short: { maxAge: 42, staleMaxAge: 0, swr: false } })

    expect(cache && cache.presets.short).toStrictEqual({ maxAge: 42, staleMaxAge: 0, swr: false })
  })
})

describe('customer account client id', () => {
  it('accepts a customer account block without a client id at the type level', () => {
    expectTypeOf({ name: 'shop', clients: { storefront, customerAccount: { afterLogin: '/account' } } })
      .toExtend<z.input<typeof configObjectSchema>>()
  })

  it('still refuses to parse a customer account client without a client id', () => {
    expect(issues({ name: 'shop', clients: { storefront, customerAccount: { afterLogin: '/account' } } }))
      .toContain('Client ID is required for the customer account client')
  })

  it('still refuses to parse an empty client id', () => {
    expect(issues({ name: 'shop', clients: { storefront, customerAccount: { clientId: '' } } }))
      .toContain('Client ID is required for the customer account client')
  })
})
