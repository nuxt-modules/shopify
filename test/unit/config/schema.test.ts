import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { configObjectSchema, publicConfigSchema } from '#src/schemas'

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

  it('parses the public schema without a clients block', () => {
    const config = publicConfigSchema.parse({ name: 'shop' })

    expect(config.clients).toStrictEqual({})
  })
})

describe('api version', () => {
  it('names the invalid version in the error', () => {
    const message = issues({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: '1999-01' } } })

    expect(message).toContain('Unsupported API version "1999-01"')
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

  it('scans vue files through the default document list', () => {
    const config = configObjectSchema.parse({ name: 'shop', clients: { storefront } })

    expect(config.clients.storefront?.documents?.[0]).toBe('**/*.{gql,graphql,ts,js,vue}')
  })
})

describe('public config', () => {
  it('never carries server-only storefront credentials', () => {
    const config = publicConfigSchema.parse({
      name: 'shop',
      clients: { storefront: { ...storefront, privateAccessToken: 'private' } },
    })

    expect(config.clients.storefront).not.toHaveProperty('privateAccessToken')
    expect(JSON.stringify(config)).not.toContain('private')
  })

  it('never carries customer account secrets or session config', () => {
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
    expect(config.clients.customerAccount).not.toHaveProperty('session')
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
})
