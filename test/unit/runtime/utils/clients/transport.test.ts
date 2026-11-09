import type { AdminApiClient } from '@nuxtjs/shopify/admin'
import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'

import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createStorage } from 'unstorage'

import { configObjectSchema } from '#src/schemas'
import { createAdminApiClient, createAdminConfig } from '#src/runtime/utils/clients/admin'
import { createCustomerAccountApiClient, createCustomerAccountConfig } from '#src/runtime/utils/clients/customer-account'
import { createStorefrontApiClient, createStorefrontConfig } from '#src/runtime/utils/clients/storefront'
import {
  BUYER_IP_HEADER,
  PRIVATE_TOKEN_HEADER,
  PUBLIC_TOKEN_HEADER,
  STOREFRONT_ID_HEADER,
  createTransport,
  withApiVersion,
} from '#src/runtime/utils/clients/transport'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const storefront = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok', retries: 0 } } }

const proxiedStorefront = configObjectSchema.parse({ name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok' } } })
const proxiedCustomerAccount = configObjectSchema.parse({
  name: 'shop',
  shopId: '1234',
  clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid' } },
})
const admin = { name: 'shop', clients: { admin: { apiVersion: API_VERSION, accessToken: 'shpat_x', retries: 0 } } }
const mock = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, mock: true, retries: 0 } } }

const customerAccount = {
  name: 'shop',
  shopId: '1234',
  clients: {
    customerAccount: {
      apiVersion: API_VERSION,
      clientId: 'cid',
      retries: 0,
    },
  },
}

describe('client factories', () => {
  it('create each client from its own config', () => {
    expect(createStorefrontApiClient(storefront).config.apiUrl).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
    expect(createAdminApiClient(admin).config.apiUrl).toBe(`https://shop.myshopify.com/admin/api/${API_VERSION}/graphql.json`)
    expect(createCustomerAccountApiClient(customerAccount, { auth: () => 'token' }).config.apiUrl).toBe(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`)
  })

  it('type each client, and take the config as written in `nuxt.config`', () => {
    expectTypeOf(createStorefrontApiClient({ name: 'shop', clients: { storefront: { publicAccessToken: 'token' } } }))
      .toEqualTypeOf<StorefrontApiClient>()
    expectTypeOf(createCustomerAccountApiClient({ name: 'shop', shopId: '1' }, { auth: () => 'token' }))
      .toEqualTypeOf<CustomerAccountApiClient>()
    expectTypeOf(createAdminApiClient({ name: 'shop', clients: { admin: { clientId: 'id', clientSecret: 'secret' } } }))
      .toEqualTypeOf<AdminApiClient>()
  })
})

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

  it('replaces the version segment of both proxy paths', () => {
    expect(withApiVersion(`http://localhost:3000/api/${API_VERSION}/graphql.json`, OTHER_API_VERSION))
      .toBe(`http://localhost:3000/api/${OTHER_API_VERSION}/graphql.json`)

    expect(withApiVersion(`http://localhost:3000/account/customer/api/${API_VERSION}/graphql`, OTHER_API_VERSION))
      .toBe(`http://localhost:3000/account/customer/api/${OTHER_API_VERSION}/graphql`)
  })

  it('leaves a url without a version segment untouched', () => {
    expect(withApiVersion('https://shopify.com/1234/account/customer/graphql', OTHER_API_VERSION))
      .toBe('https://shopify.com/1234/account/customer/graphql')
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
  it('rewrites the request url, not just the reported version', () => {
    const client = createStorefrontApiClient(storefront as never, { apiVersion: OTHER_API_VERSION })

    expect(client.config.apiVersion).toBe(OTHER_API_VERSION)
    expect(client.config.apiUrl).toBe(`https://shop.myshopify.com/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('sends a browser request through Hydrogen\'s Storefront API proxy path for the requested version', () => {
    const client = createStorefrontApiClient(proxiedStorefront, {
      apiVersion: OTHER_API_VERSION,
      origin: 'http://localhost:3000',
    })

    expect(client.config.apiUrl).toBe(`http://localhost:3000/api/${OTHER_API_VERSION}/graphql.json`)
  })

  it('sends a browser request through the customer account proxy path for the requested version', () => {
    const client = createCustomerAccountApiClient(proxiedCustomerAccount, {
      apiVersion: OTHER_API_VERSION,
      origin: 'http://localhost:3000',
    })

    expect(client.config.apiUrl).toBe(`http://localhost:3000/account/customer/api/${OTHER_API_VERSION}/graphql`)
  })

  it('switches the proxy path per request when a request asks for another version', () => {
    const client = createCustomerAccountApiClient(proxiedCustomerAccount, { origin: 'http://localhost:3000' })

    expect(client.getApiUrl(OTHER_API_VERSION)).toBe(`http://localhost:3000/account/customer/api/${OTHER_API_VERSION}/graphql`)
  })

  it('calls Shopify directly when the proxy is turned off', () => {
    const client = createCustomerAccountApiClient({ ...proxiedCustomerAccount, clients: { customerAccount: { ...proxiedCustomerAccount.clients.customerAccount!, proxy: false } } }, {
      origin: 'http://localhost:3000',
    })

    expect(client.config.apiUrl).toBe(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`)
  })

  it('calls Shopify directly when the storefront proxy is turned off', () => {
    const client = createStorefrontApiClient({ ...proxiedStorefront, clients: { storefront: { ...proxiedStorefront.clients.storefront!, proxy: false } } }, {
      origin: 'http://localhost:3000',
    })

    expect(client.config.apiUrl).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
  })

  it('caches with the presets configured for the storefront client', async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: { shop: { name: 'shop' } } }))

    vi.stubGlobal('fetch', fetchMock)

    try {
      const client = createStorefrontApiClient<true>(
        { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'token', cache: { presets: { custom: { maxAge: 60 } } } } } },
        { browserCache: createStorage() },
      )

      await client.request('query Shop { shop { name } }', { cache: 'custom' })
      await client.request('query Shop { shop { name } }', { cache: 'custom' })

      expect(fetchMock).toHaveBeenCalledOnce()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('creates a storefront client whose cache is set to null, as before', () => {
    expect(() => createStorefrontApiClient({ name: 'shop', clients: { storefront: { publicAccessToken: 'token', cache: null } } } as never)).not.toThrow()
  })

  it('calls Shopify directly when no origin is given, as on the server', () => {
    const client = createStorefrontApiClient(proxiedStorefront, {})

    expect(client.config.apiUrl).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
  })

  it('does not send the server cache header for a cached preset without a server cache', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)

    try {
      const client = createStorefrontApiClient(proxiedStorefront, { browserCache: createStorage() })

      await client.request('query X { a }', { cache: 'long' } as never)

      expect(fetchMock).toHaveBeenCalled()

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

      expect(url).toBe(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
      expect(init.headers).not.toHaveProperty('X-Shopify-Server-Cache')
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('sends a browser request through Hydrogen\'s Storefront API proxy path for the configured version', () => {
    const client = createStorefrontApiClient(proxiedStorefront, { origin: 'http://localhost:3000' })

    expect(client.config.apiUrl).toBe(`http://localhost:3000/api/${API_VERSION}/graphql.json`)
  })
})

describe('client config resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the private token in preference to the public one', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', privateAccessToken: 'private', retries: 0 } },
    } as never)

    expect(config.headers).toMatchObject({ [PRIVATE_TOKEN_HEADER]: 'private' })
    expect(config.headers).not.toHaveProperty(PUBLIC_TOKEN_HEADER)
  })

  it('tells Shopify which storefront a server request belongs to, as Hydrogen\'s client does', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      storefrontId: '1000000001',
      clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private', retries: 0 } },
    } as never)

    expect(config.headers).toMatchObject({ [STOREFRONT_ID_HEADER]: '1000000001' })
  })

  it('leaves the storefront ID of browser requests to Hydrogen\'s proxy', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    const config = createStorefrontConfig({
      name: 'shop',
      storefrontId: '1000000001',
      clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0 } },
    } as never)

    expect(config.headers).not.toHaveProperty(STOREFRONT_ID_HEADER)
  })

  it('does not send the storefront ID to mock.shop', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      storefrontId: '1000000001',
      clients: { storefront: { apiVersion: API_VERSION, mock: true, retries: 0 } },
    } as never)

    expect(config.headers).not.toHaveProperty(STOREFRONT_ID_HEADER)
  })

  it('builds the customer account API URL from the shop ID and the configured version, as Hydrogen does', () => {
    const config = createCustomerAccountConfig({
      name: 'shop',
      shopId: '1234',
      clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid', retries: 0 } },
    } as never)

    expect(config.apiUrl).toBe(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`)
  })

  it('takes the shop ID from the inline config of a client created outside Nuxt, which needs no client ID', () => {
    const client = createCustomerAccountApiClient({ name: 'shop', shopId: '1234', apiVersion: API_VERSION }, { auth: () => 'token' })

    expect(client.config.apiUrl).toBe(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`)
  })

  it('refuses a customer account client without the shop ID', () => {
    expect(() => createCustomerAccountConfig({
      name: 'shop',
      clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid', retries: 0 } },
    } as never)).toThrow('shopId')
  })

  it('never sends the private token to mock.shop', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: API_VERSION, mock: true, privateAccessToken: 'private', retries: 0 } },
    } as never)

    expect(config.apiUrl).toContain('mock.shop')
    expect(config.headers).not.toHaveProperty(PRIVATE_TOKEN_HEADER)
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

describe('server-side cookie forwarding', () => {
  const proxiedCustomerAccount = configObjectSchema.parse(customerAccount)

  const cookie = '__Host-session=sealed; app_session=secret; _shopify_essential=abc'

  beforeEach(() => {
    vi.stubGlobal('__NUXT_SERVER__', true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not send browser cookies when the customer account client calls Shopify directly', () => {
    const event = createTestEvent({ headers: { cookie } })

    const client = createCustomerAccountApiClient(proxiedCustomerAccount, { event })

    expect(client.config.apiUrl).toBe(`https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`)
    expect(client.config.headers).not.toHaveProperty('Cookie')
  })

  it('sends no browser cookies through its own proxy from the server either, since nothing calls the proxy from there', () => {
    const event = createTestEvent({ headers: { cookie } })

    const client = createCustomerAccountApiClient(proxiedCustomerAccount, { event, origin: 'http://localhost:3000' })

    expect(client.config.apiUrl).toBe(`http://localhost:3000/account/customer/api/${API_VERSION}/graphql`)
    expect(client.config.headers).not.toHaveProperty('Cookie')
  })

  it('sends only Shopify cookies from the storefront client', () => {
    const event = createTestEvent({ headers: { cookie } })

    const client = createStorefrontApiClient(storefront as never, { event })

    expect(client.config.headers['Cookie']).toBe('_shopify_essential=abc')
  })
})

describe('buyer ip header', () => {
  const privateStorefront = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private', retries: 0 } } }

  it('sends the buyer ip alongside a private access token', () => {
    const client = createStorefrontApiClient(privateStorefront as never, { buyerIp: '203.0.113.4' })

    expect(client.config.headers[BUYER_IP_HEADER]).toBe('203.0.113.4')
  })

  it('does not send the buyer ip when the client uses a public access token', () => {
    const client = createStorefrontApiClient(storefront as never, { buyerIp: '203.0.113.4' })

    expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
  })

  it('omits the buyer ip when none is resolved', () => {
    const client = createStorefrontApiClient(privateStorefront as never, {})

    expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
  })

  describe('resolved from the request on the server', () => {
    const withHeader = (buyerIpHeader: string) => ({
      ...privateStorefront,
      clients: { storefront: { ...privateStorefront.clients.storefront, buyerIpHeader } },
    })

    beforeEach(() => {
      vi.stubGlobal('__NUXT_SERVER__', true)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('reads the buyer ip from the configured header', () => {
      const event = createTestEvent({ headers: { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6' } })

      const client = createStorefrontApiClient(withHeader('x-real-ip') as never, { event })

      expect(client.config.headers[BUYER_IP_HEADER]).toBe('203.0.113.9')
    })

    it('never trusts a client supplied x-forwarded-for without a configured header', () => {
      const event = createTestEvent({ headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' } })

      const client = createStorefrontApiClient(privateStorefront as never, { event })

      expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
    })

    it('ignores a header value that is not an ip address', () => {
      const event = createTestEvent({ headers: { 'x-real-ip': 'definitely-not-an-ip' } })

      const client = createStorefrontApiClient(withHeader('x-real-ip') as never, { event })

      expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
    })

    it('accepts an IPv6 buyer ip', () => {
      const event = createTestEvent({ headers: { 'cf-connecting-ip': '2001:db8::1' } })

      const client = createStorefrontApiClient(withHeader('cf-connecting-ip') as never, { event })

      expect(client.config.headers[BUYER_IP_HEADER]).toBe('2001:db8::1')
    })

    it('allows opting out of the buyer ip it would resolve from the request', () => {
      const event = createTestEvent({ headers: { 'x-real-ip': '203.0.113.9' } })

      const client = createStorefrontApiClient(withHeader('x-real-ip') as never, { event, buyerIp: false })

      expect(client.config.headers).not.toHaveProperty(BUYER_IP_HEADER)
    })
  })
})

describe('request timeout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function stubHangingShopify() {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      if (init?.signal?.aborted) reject(init.signal.reason)

      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
    }))

    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  it('gives up on a request Shopify never answers after Hydrogen\'s 30 seconds', async () => {
    const deadline = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)

    stubHangingShopify()

    const pending = createStorefrontApiClient(storefront, { throwOnErrors: false }).request('query Shop { shop { name } }')

    deadline.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

    const { errors } = await pending

    expect(timeout).toHaveBeenCalledWith(30_000)
    expect(errors).toBeDefined()
  })

  it('still stops when the caller aborts before the deadline', async () => {
    stubHangingShopify()

    const caller = new AbortController()

    const pending = createStorefrontApiClient(storefront, { throwOnErrors: false }).request('query Shop { shop { name } }', { signal: caller.signal })

    caller.abort()

    await expect(pending).resolves.toBeDefined()
  })

  it('leaves the requests of the browser to the browser', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    const timeout = vi.spyOn(AbortSignal, 'timeout')

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { shop: { name: 'Shop' } } })))

    await createStorefrontApiClient(storefront, { throwOnErrors: false }).request('query Shop { shop { name } }')

    expect(timeout).not.toHaveBeenCalled()
  })
})
