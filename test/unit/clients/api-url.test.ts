import { describe, expect, it, vi } from 'vitest'
import { createStorage } from 'unstorage'

import { configObjectSchema } from '#src/schemas'
import { createAdminConfig } from '#src/runtime/utils/clients/admin'
import { createCustomerAccountConfig } from '#src/runtime/utils/clients/customer-account'
import { createStorefrontConfig } from '#src/runtime/utils/clients/storefront'
import { createClient } from '#src/runtime/utils/clients/create'
import {
  BUYER_IP_HEADER,
  PRIVATE_TOKEN_HEADER,
  PROXY_API_VERSION_HEADER,
  PUBLIC_TOKEN_HEADER,
  createTransport,
  isVersionedApiUrl,
  withApiVersion,
} from '#src/runtime/utils/clients/transport'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const storefront = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok', retries: 0 } } }

const proxiedStorefront = configObjectSchema.parse({ name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok' } } })
const admin = { name: 'shop', clients: { admin: { apiVersion: API_VERSION, accessToken: 'shpat_x', retries: 0 } } }
const mock = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, mock: true, retries: 0 } } }

const customerAccount = {
  name: 'shop',
  clients: {
    customerAccount: {
      apiVersion: API_VERSION,
      clientId: 'cid',
      apiURL: `https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`,
      retries: 0,
    },
  },
}

describe('withApiVersion', () => {
  it('replaces the version segment of every Shopify API url shape', () => {
    expect(withApiVersion(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`, OTHER_API_VERSION))
      .toBe(`https://shop.myshopify.com/api/${OTHER_API_VERSION}/graphql.json`)

    expect(withApiVersion(`https://shop.myshopify.com/admin/api/${API_VERSION}/graphql.json`, OTHER_API_VERSION))
      .toBe(`https://shop.myshopify.com/admin/api/${OTHER_API_VERSION}/graphql.json`)

    expect(withApiVersion(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`, OTHER_API_VERSION))
      .toBe(`https://shopify.com/1234/account/customer/api/${OTHER_API_VERSION}/graphql`)

    expect(withApiVersion(`https://mock.shop/api/${API_VERSION}/graphql.json`, OTHER_API_VERSION))
      .toBe(`https://mock.shop/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('leaves a proxy url untouched', () => {
    expect(withApiVersion('http://localhost:3000/_proxy/storefront', OTHER_API_VERSION))
      .toBe('http://localhost:3000/_proxy/storefront')

    expect(isVersionedApiUrl('http://localhost:3000/_proxy/storefront')).toBe(false)
    expect(isVersionedApiUrl(`https://shop.myshopify.com/admin/api/${API_VERSION}/graphql.json`)).toBe(true)
  })
})

describe('per-request apiVersion override', () => {
  it('keeps the storefront endpoint', () => {
    const transport = createTransport(createStorefrontConfig(storefront as never))

    expect(transport.getApiUrl()).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
    expect(transport.getApiUrl(OTHER_API_VERSION)).toBe(`https://shop.myshopify.com/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('keeps the admin prefix', () => {
    const transport = createTransport(createAdminConfig(admin as never))

    expect(transport.getApiUrl(OTHER_API_VERSION)).toBe(`https://shop.myshopify.com/admin/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('keeps the customer account host', () => {
    const transport = createTransport(createCustomerAccountConfig(customerAccount as never))

    expect(transport.getApiUrl(OTHER_API_VERSION)).toBe(`https://shopify.com/1234/account/customer/api/${OTHER_API_VERSION}/graphql`)
  })

  it('keeps the mock storefront host', () => {
    const transport = createTransport(createStorefrontConfig(mock as never))

    expect(transport.getApiUrl(OTHER_API_VERSION)).toBe(`https://mock.shop/api/${OTHER_API_VERSION}/graphql.json`)
  })
})

describe('client-level apiVersion option', () => {
  const definition = { kind: 'storefront', createConfig: createStorefrontConfig, cache: true } as never

  it('rewrites the request url, not just the reported version', () => {
    const client = createClient(definition, storefront as never, { apiVersion: OTHER_API_VERSION } as never)

    expect(client.config.apiVersion).toBe(OTHER_API_VERSION)
    expect(client.config.apiUrl).toBe(`https://shop.myshopify.com/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('asks the proxy for the version instead of bypassing it', () => {
    const client = createClient(definition, proxiedStorefront as never, {
      apiVersion: OTHER_API_VERSION,
      origin: 'http://localhost:3000',
    } as never)

    expect(client.config.apiUrl).toBe('http://localhost:3000/_proxy/storefront')
    expect(client.config.headers[PROXY_API_VERSION_HEADER]).toBe(OTHER_API_VERSION)
  })

  it('calls Shopify directly when no origin is given, as on the server', () => {
    const client = createClient(definition, proxiedStorefront as never, {} as never)

    expect(client.config.apiUrl).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
  })

  it('does not send the proxy cache header for a cached tier when it calls Shopify directly', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)

    try {
      const client = createClient(definition, proxiedStorefront as never, { cache: createStorage() } as never)

      await client.request('query X { a }', { cache: 'long' } as never)

      expect(fetchMock).toHaveBeenCalled()

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(url).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
      expect(init.headers).not.toHaveProperty('X-Shopify-Proxy-Cache')
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('does not set the proxy version header when no override is given', () => {
    const client = createClient(definition, proxiedStorefront as never, { origin: 'http://localhost:3000' } as never)

    expect(client.config.apiUrl).toBe('http://localhost:3000/_proxy/storefront')
    expect(client.config.headers).not.toHaveProperty(PROXY_API_VERSION_HEADER)
  })
})

describe('client config resolution', () => {
  it('sends the private token in preference to the public one', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', privateAccessToken: 'private', retries: 0 } },
    } as never)

    expect(config.headers).toMatchObject({ [PRIVATE_TOKEN_HEADER]: 'private' })
    expect(config.headers).not.toHaveProperty(PUBLIC_TOKEN_HEADER)
  })

  it('does not build a storefront config without a token', () => {
    expect(() => createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: API_VERSION, retries: 0 } },
    } as never)).toThrow(/missing access token/)
  })

  it('does not build a client config without a shop name', () => {
    expect(() => createStorefrontConfig({
      name: '',
      clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok', retries: 0 } },
    } as never)).toThrow(/missing shop name/)
  })
})

describe('buyer ip header', () => {
  const definition = { kind: 'storefront', createConfig: createStorefrontConfig, cache: true } as never

  const privateStorefront = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private', retries: 0 } } }

  it('sends the buyer ip alongside a private access token', () => {
    const client = createClient(definition, privateStorefront as never, { buyerIp: '203.0.113.4' } as never)

    expect(client.config.headers[BUYER_IP_HEADER]).toBe('203.0.113.4')
  })

  it('does not send the buyer ip when the client uses a public access token', () => {
    const client = createClient(definition, storefront as never, { buyerIp: '203.0.113.4' } as never)

    expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
  })

  it('omits the buyer ip when none is resolved', () => {
    const client = createClient(definition, privateStorefront as never, {} as never)

    expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
  })

  it('allows opting out of the buyer ip it would resolve from the request', () => {
    const event = createTestEvent({ headers: { 'x-forwarded-for': '203.0.113.9' } })

    const resolved = createClient(definition, privateStorefront as never, { event } as never)
    const optedOut = createClient(definition, privateStorefront as never, { event, buyerIp: false } as never)

    expect(resolved.config.headers[BUYER_IP_HEADER]).toBe('203.0.113.9')
    expect(optedOut.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
  })
})
