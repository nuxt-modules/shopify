import { createShopifyRequestContext } from '@shopify/hydrogen'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getResponseHeader, getSetCookieHeaders } from '#test/helpers/event'
import { createLoggerStub } from '#test/helpers/logger'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('#src/runtime/utils/log', () => ({
  createLogger: () => createLoggerStub({ warn }),
}))

const { applyShopifyResponseHeaders, getShopifyRequestContext, resolveShopifyMarket } = await import('#src/runtime/server/utils/request-context')
const { createHydrogenStorefrontClient } = await import('#src/runtime/server/utils/storefront/hydrogen')

describe('resolveShopifyMarket', () => {
  const event = (path = '/cart.js') => createTestEvent({ path, headers: { host: 'shop.test' } })

  const configured = { clients: {}, defaultMarket: { country: 'DE', language: 'DE' } } as never

  const lookUpWith = async (country: string, language: string) => {
    const fetchMock = vi.fn(async () => Response.json({
      data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: country, currency: { isoCode: 'EUR' } }, language: { isoCode: language } } },
    }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/request-context')

    return { fetchMock, resolveShopifyMarket }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    warn.mockClear()
  })

  it('looks up the shop\'s default market once, through the storefront client', async () => {
    const { fetchMock, resolveShopifyMarket } = await lookUpWith('NL', 'NL')
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, analytics: false } as never

    await expect(resolveShopifyMarket(event(), config)).resolves.toMatchObject({ country: 'NL', language: 'NL' })
    await expect(resolveShopifyMarket(event(), config)).resolves.toMatchObject({ country: 'NL', language: 'NL' })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('fails with a clear error, without trying a lookup, when there is no storefront client to look the market up with', async () => {
    const { fetchMock, resolveShopifyMarket } = await lookUpWith('NL', 'NL')

    await expect(resolveShopifyMarket(event(), { name: 'shop', clients: {}, analytics: false } as never))
      .rejects.toMatchObject({ statusCode: 502, message: expect.stringContaining('event.context.shopifyMarket') })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('uses the configured market', async () => {
    await expect(resolveShopifyMarket(event(), configured)).resolves.toEqual({ country: 'DE', language: 'DE' })
  })

  it('treats an empty market, as declared for runtime environment variables, as no market', async () => {
    const { fetchMock, resolveShopifyMarket } = await lookUpWith('NL', 'NL')
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, defaultMarket: { country: '', language: '' }, analytics: false } as never

    await expect(resolveShopifyMarket(event(), config)).resolves.toMatchObject({ country: 'NL', language: 'NL' })

    expect(fetchMock).toHaveBeenCalledOnce()

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]

    expect(JSON.parse(init.body as string).variables).toStrictEqual({})
  })

  it('never looks the market up when one is configured', async () => {
    const { fetchMock, resolveShopifyMarket } = await lookUpWith('NL', 'NL')
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, defaultMarket: { country: 'DE', language: 'DE' }, analytics: false } as never

    await expect(resolveShopifyMarket(event(), config)).resolves.toEqual({ country: 'DE', language: 'DE' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps retrying a lookup that came back without data, even when errors don\'t throw', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ errors: [{ message: 'Internal error' }] }))
      .mockResolvedValue(Response.json({ data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: 'NL', currency: { isoCode: 'EUR' } }, language: { isoCode: 'NL' } } } }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/request-context')
    const config = { name: 'shop', shopId: '1', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, errors: { throw: false }, analytics: {} } as never

    await expect(resolveShopifyMarket(event(), config)).rejects.toMatchObject({ statusCode: 502 })
    await expect(resolveShopifyMarket(event(), config)).resolves.toMatchObject({ country: 'NL', language: 'NL' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('warns once about a failed lookup instead of logging an error on every request', async () => {
    const log = vi.fn()
    const fetchMock = vi.fn(async () => new Response('Invalid API key', { status: 401 }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/request-context')
    const config = { name: 'shop', shopId: '1', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, logger: { reporters: [{ log }] }, analytics: {} } as never

    await expect(resolveShopifyMarket(event(), config)).rejects.toMatchObject({ statusCode: 502 })
    await expect(resolveShopifyMarket(event(), config)).rejects.toMatchObject({ statusCode: 502 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('uses the market the app resolved for the request', async () => {
    const request = event()

    request.context.shopifyMarket = { country: 'CA', language: 'FR' }

    await expect(resolveShopifyMarket(request, configured)).resolves.toEqual({ country: 'CA', language: 'FR' })
  })

  it('leaves the country of the sign-in page to the market of the request, as Hydrogen does', async () => {
    await expect(resolveShopifyMarket(event('/account/login?country=FR'), configured)).resolves.toEqual({ country: 'DE', language: 'DE' })
  })
})

describe('getShopifyRequestContext', () => {
  it('creates one request context per request', async () => {
    runtimeConfig._shopify = { clients: {}, defaultMarket: { country: 'DE', language: 'DE' } }

    const event = createTestEvent({ path: '/account', headers: { 'host': 'shop.test', 'x-forwarded-proto': 'https' } })

    const requestContext = await getShopifyRequestContext(event)

    await expect(getShopifyRequestContext(event)).resolves.toBe(requestContext)
    expect(requestContext.i18n).toMatchObject({ country: 'DE', language: 'DE' })
    expect(requestContext.url).toBe('https://shop.test/account')
    await expect(getShopifyRequestContext(createTestEvent({ path: '/account', headers: { host: 'shop.test' } }))).resolves.not.toBe(requestContext)
  })

  it('uses a private storefront client with the buyer\'s IP when a private token is configured, as Hydrogen does', async () => {
    const config = { name: 'shop', storefrontId: '42', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', privateAccessToken: 'private' } }, defaultMarket: { country: 'DE', language: 'DE' } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))
    const storefrontClient = createHydrogenStorefrontClient(requestContext, config as never)

    expect(requestContext.buyerIp).toBe('203.0.113.7')
    expect(storefrontClient.type).toBe('private')
    expect(storefrontClient.storefrontId).toBe('42')
  })

  it('uses a private storefront client without buyer context when the buyer\'s IP is unknown', async () => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private' } }, defaultMarket: { country: 'DE', language: 'DE' } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(requestContext.buyerIp).toBeUndefined()
    expect(createHydrogenStorefrontClient(requestContext, config as never).type).toBe('private_no_buyer_context')
  })

  it.each([
    ['only a public token', { publicAccessToken: 'public' }],
    ['the mock shop', { mock: true, privateAccessToken: 'private' }],
  ])('keeps a public storefront client for %s', async (_, storefront) => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, ...storefront } }, defaultMarket: { country: 'DE', language: 'DE' } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))

    expect(createHydrogenStorefrontClient(requestContext, config as never).type).toBe('public')
  })

  it('leaves the buyer\'s IP out of the request context of the mock shop, which never gets the private token', async () => {
    runtimeConfig._shopify = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, mock: true, privateAccessToken: 'private' } }, defaultMarket: { country: 'DE', language: 'DE' } }

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))

    expect(requestContext.buyerIp).toBeUndefined()
  })

  it('leaves the buyer\'s IP out of the request context without a private token', async () => {
    runtimeConfig._shopify = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, defaultMarket: { country: 'DE', language: 'DE' } }

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))

    expect(requestContext.buyerIp).toBeUndefined()
  })

  it('reuses the request context of the Shopify routes middleware', async () => {
    const event = createTestEvent({ path: '/account/login', headers: { host: 'shop.test' } })

    event.context.shopifyRequestContext = { marker: true } as never

    await expect(getShopifyRequestContext(event)).resolves.toEqual({ marker: true })
  })
})

describe('applyShopifyResponseHeaders', () => {
  const PRIVATE = 'private, no-store, max-age=0, must-revalidate'
  const SHARED = 'public, s-maxage=60'

  function response(headers: Record<string, string | string[]>, { personalized = false } = {}) {
    const event = createTestEvent({ path: '/account', headers: { host: 'shop.test' } })

    for (const [name, value] of Object.entries(headers)) event.node.res.setHeader(name, value)

    return {
      event,
      withRequestContext() {
        const requestContext = createShopifyRequestContext({
          request: new Request('https://shop.test/account'),
          i18n: { country: 'US', language: 'EN' },
        })

        if (personalized) requestContext.markResponseAsPersonalized('customer-session')

        event.context.shopifyRequestContext = requestContext

        return event
      },
    }
  }

  it('leaves a response without a Shopify request context alone', () => {
    const { event } = response({ 'cache-control': SHARED })

    applyShopifyResponseHeaders(event)

    expect(getResponseHeader(event, 'cache-control')).toBe(SHARED)
    expect(event.node.res.hasHeader('powered-by')).toBe(false)
  })

  it('keeps a personalized response out of shared caches, CDN directives included', () => {
    const event = response({
      'cache-control': SHARED,
      'cdn-cache-control': 'max-age=60',
      'vercel-cdn-cache-control': 'max-age=60',
      'surrogate-control': 'max-age=60',
      'content-type': 'text/html;charset=utf-8',
      'set-cookie': ['a=1; Path=/', 'b=2; Path=/'],
    }, { personalized: true }).withRequestContext()

    applyShopifyResponseHeaders(event)

    expect(getResponseHeader(event, 'cache-control')).toBe(PRIVATE)

    for (const name of ['cdn-cache-control', 'vercel-cdn-cache-control', 'surrogate-control']) {
      expect(event.node.res.hasHeader(name), name).toBe(false)
    }

    expect(getResponseHeader(event, 'content-type')).toBe('text/html;charset=utf-8')
    expect(getSetCookieHeaders(event)).toEqual(['a=1; Path=/', 'b=2; Path=/'])
  })

  it('keeps a response that is not personalized cacheable', () => {
    const event = response({ 'cache-control': SHARED }).withRequestContext()

    applyShopifyResponseHeaders(event)

    expect(getResponseHeader(event, 'cache-control')).toBe(SHARED)
  })

  it('leaves a response alone once its headers are sent', () => {
    const event = response({ 'cache-control': SHARED }, { personalized: true }).withRequestContext()

    event.node.res.writeHead(200)

    expect(() => applyShopifyResponseHeaders(event)).not.toThrow()
  })
})
