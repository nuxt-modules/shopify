import { describe, expect, it } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { getConfiguredClients, hasPublicClient, isPublicClient } from '#src/utils/clients'

const storefront = (client: Record<string, unknown>) => ({ clients: { storefront: client } } as never)

describe('isPublicClient', () => {
  it('treats a storefront with a public access token as public', () => {
    expect(isPublicClient({ publicAccessToken: 'tok' } as never)).toBe(true)
  })

  it('treats a mock storefront as public', () => {
    expect(isPublicClient({ mock: true } as never)).toBe(true)
  })

  it('treats a customer account client with a client id as public', () => {
    expect(isPublicClient({ clientId: 'cid' } as never)).toBe(true)
  })

  it('does not treat a private-token-only storefront as public', () => {
    expect(isPublicClient({ privateAccessToken: 'private' } as never)).toBe(false)
  })

  it('does not treat an admin client as public', () => {
    expect(isPublicClient({ accessToken: 'shpat_x' } as never)).toBe(false)
  })
})

describe('hasPublicClient', () => {
  it('is false when the only storefront credential is a private access token', () => {
    expect(hasPublicClient(storefront({ privateAccessToken: 'private' }))).toBe(false)
  })

  it('is true when a public access token is present alongside a private one', () => {
    expect(hasPublicClient(storefront({ privateAccessToken: 'private', publicAccessToken: 'tok' }))).toBe(true)
  })

  it('is true for a mock storefront', () => {
    expect(hasPublicClient(storefront({ mock: true }))).toBe(true)
  })

  it('is true when a customer account client id is configured', () => {
    expect(hasPublicClient({ clients: { customerAccount: { clientId: 'cid' } } } as never)).toBe(true)
  })

  it('is false when only an admin client is configured', () => {
    expect(hasPublicClient({ clients: { admin: { accessToken: 'shpat_x' } } } as never)).toBe(false)
  })
})

describe('getConfiguredClients', () => {
  it('reports every configured client', () => {
    const clients = getConfiguredClients({
      clients: {
        storefront: { privateAccessToken: 'private' },
        admin: { accessToken: 'shpat_x' },
      },
    } as never)

    expect(clients).toEqual([ShopifyClientType.Storefront, ShopifyClientType.Admin])
  })
})
