import { createShopifyRequestContext } from '@shopify/hydrogen'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getResponseHeader, getSetCookieHeaders } from '#test/helpers/event'
import { createLogReporter } from '#test/helpers/logger'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => runtimeConfig, useNitroApp: () => ({ hooks: { callHook: vi.fn(), callHookWith: vi.fn() } }) }))

const { applyShopifyResponseHeaders, captureSubrequestHeaders, getShopifyRequestContext } = await import('#src/runtime/server/utils/request-context')
const { createHydrogenStorefrontClient } = await import('#src/runtime/server/utils/storefront/hydrogen')

describe('request locale', () => {
  const event = (path = '/cart.js', host = 'shop.test') => createTestEvent({ path, headers: { host } })

  const storefront = { apiVersion: API_VERSION, publicAccessToken: 'public' }

  const pathname = {
    defaultLocale: { language: 'EN', country: 'US' },
    routing: { type: 'pathname', locales: [{ language: 'FR', country: 'CA' }] },
  }

  const lookUpWith = async (config: Record<string, unknown>) => {
    const fetchMock = vi.fn(async () => Response.json({
      data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: 'NL', currency: { isoCode: 'EUR' } }, language: { isoCode: 'NL' } } },
    }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    runtimeConfig._shopify = config

    const { getShopifyRequestContext } = await import('#src/runtime/server/utils/request-context')

    return { fetchMock, getShopifyRequestContext }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const unset: [string, Record<string, unknown>][] = [
    ['no i18n', {}],
    ['only the empty placeholder declared for environment variables', { i18n: { defaultLocale: { country: '', language: '', currency: '' } } }],
  ]

  it.each(unset)('fails with a clear error, without trying a lookup, when there is no storefront client to look the default locale up with and %s', async (_, i18n) => {
    const { fetchMock, getShopifyRequestContext } = await lookUpWith({ name: 'shop', clients: {}, ...i18n, analytics: false })

    await expect(getShopifyRequestContext(event()))
      .rejects.toMatchObject({ statusCode: 502, message: expect.stringContaining('`i18n.defaultLocale`') })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(unset)('looks up the shop\'s default locale with %s', async (_, i18n) => {
    const { fetchMock, getShopifyRequestContext } = await lookUpWith({ name: 'shop', clients: { storefront }, ...i18n, analytics: false })

    await expect(getShopifyRequestContext(event())).resolves.toMatchObject({ locale: { country: 'NL', language: 'NL', pathPrefix: '' } })

    expect(fetchMock).toHaveBeenCalledOnce()

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]

    expect(JSON.parse(init.body as string).variables).toStrictEqual({})
  })

  it('uses the configured default locale, without looking it up', async () => {
    const { fetchMock, getShopifyRequestContext } = await lookUpWith({ name: 'shop', clients: { storefront }, i18n: { defaultLocale: { country: 'DE', language: 'DE' } }, analytics: false })

    await expect(getShopifyRequestContext(event())).resolves.toMatchObject({ locale: { country: 'DE', language: 'DE', pathPrefix: '' } })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('warns once about a failed lookup instead of logging an error on every request', async () => {
    const { log, logger } = createLogReporter()
    const fetchMock = vi.fn(async () => new Response('Invalid API key', { status: 401 }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    runtimeConfig._shopify = { name: 'shop', shopId: '1', clients: { storefront }, logger, analytics: {} }

    const { getShopifyRequestContext } = await import('#src/runtime/server/utils/request-context')

    await expect(getShopifyRequestContext(event())).rejects.toMatchObject({ statusCode: 502 })
    await expect(getShopifyRequestContext(event())).rejects.toMatchObject({ statusCode: 502 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    // A single warning through the configured server logger, not an error per request
    expect(log).toHaveBeenCalledOnce()
    expect(log.mock.calls[0]![0]).toMatchObject({ type: 'warn', tag: 'shopify', args: [expect.stringContaining('`i18n.defaultLocale` with its `currency`'), expect.anything()] })
  })

  it.each([
    ['the locale of a path prefix', '/fr-ca/products/shirt', { language: 'FR', country: 'CA', pathPrefix: '/fr-ca' }],
    ['the default locale for a path without a known prefix', '/xx/products/shirt', { language: 'EN', country: 'US', pathPrefix: '' }],
  ])('matches %s, as Hydrogen does', async (_, path, locale) => {
    runtimeConfig._shopify = { clients: {}, i18n: pathname }

    await expect(getShopifyRequestContext(event(path))).resolves.toMatchObject({ locale })
  })

  it('matches the locale of the hostname with domain routing', async () => {
    runtimeConfig._shopify = {
      clients: {},
      i18n: {
        defaultLocale: { language: 'EN', country: 'US' },
        routing: { type: 'domain', locales: [{ language: 'EN', country: 'US', hostname: 'shop.test' }, { language: 'EN', country: 'CA', hostname: 'shop.ca' }] },
      },
    }

    await expect(getShopifyRequestContext(event('/', 'shop.ca'))).resolves.toMatchObject({ locale: { language: 'EN', country: 'CA', hostname: 'shop.ca', pathPrefix: '' } })
  })

  it('uses the locale that the app set for a request whose URL has no locale, with the path prefix of that locale', async () => {
    runtimeConfig._shopify = { clients: {}, i18n: pathname }

    const request = event('/api/cart')

    request.context.shopifyLocale = { language: 'FR', country: 'CA' }

    await expect(getShopifyRequestContext(request)).resolves.toMatchObject({ locale: { language: 'FR', country: 'CA', pathPrefix: '/fr-ca' } })
  })

  it('fails with Hydrogen\'s error when the app sets a locale that i18n doesn\'t define', async () => {
    runtimeConfig._shopify = { clients: {}, i18n: pathname }

    const request = event('/api/cart')

    request.context.shopifyLocale = { language: 'DE', country: 'DE' }

    await expect(getShopifyRequestContext(request)).rejects.toThrow('Locale DE-DE is not defined')
  })

  it('keeps the currency of a locale for Shopify\'s scripts', async () => {
    runtimeConfig._shopify = { clients: {}, i18n: { defaultLocale: { language: 'EN', country: 'US' }, routing: { type: 'pathname', locales: [{ language: 'FR', country: 'CA', currency: 'CAD' }] } } }

    await expect(getShopifyRequestContext(event('/fr-ca'))).resolves.toMatchObject({ locale: { currency: 'CAD' } })
  })
})

describe('getShopifyRequestContext', () => {
  it('creates one request context per request', async () => {
    runtimeConfig._shopify = { clients: {}, i18n: { defaultLocale: { country: 'DE', language: 'DE' } } }

    const event = createTestEvent({ path: '/account', headers: { 'host': 'shop.test', 'x-forwarded-proto': 'https' } })

    const requestContext = await getShopifyRequestContext(event)

    await expect(getShopifyRequestContext(event)).resolves.toBe(requestContext)
    expect(requestContext.locale).toMatchObject({ country: 'DE', language: 'DE' })
    expect(requestContext.url).toBe('https://shop.test/account')
    await expect(getShopifyRequestContext(createTestEvent({ path: '/account', headers: { host: 'shop.test' } }))).resolves.not.toBe(requestContext)
  })

  it('uses a private storefront client with the buyer\'s IP when a private token is configured, as Hydrogen does', async () => {
    const config = { name: 'shop', storefrontId: '42', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', privateAccessToken: 'private' } }, i18n: { defaultLocale: { country: 'DE', language: 'DE' } } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))
    const storefrontClient = createHydrogenStorefrontClient(requestContext, config as never)

    expect(requestContext.buyerIp).toBe('203.0.113.7')
    expect(storefrontClient.type).toBe('private')
    expect(storefrontClient.storefrontId).toBe('42')
  })

  it('uses a private storefront client without buyer context when the buyer\'s IP is unknown', async () => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private' } }, i18n: { defaultLocale: { country: 'DE', language: 'DE' } } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(requestContext.buyerIp).toBeUndefined()
    expect(createHydrogenStorefrontClient(requestContext, config as never).type).toBe('private_no_buyer_context')
  })

  it.each([
    ['only a public token', { publicAccessToken: 'public' }],
    ['the mock shop, which never gets the private token', { mock: true, privateAccessToken: 'private' }],
  ])('keeps a public storefront client and the buyer\'s IP out of the request context for %s', async (_, storefront) => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, ...storefront } }, i18n: { defaultLocale: { country: 'DE', language: 'DE' } } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))

    expect(requestContext.buyerIp).toBeUndefined()
    expect(createHydrogenStorefrontClient(requestContext, config as never).type).toBe('public')
  })

  it('reuses the request context of the Shopify routes middleware, without resolving the market again', async () => {
    runtimeConfig._shopify = { clients: {}, analytics: false }

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
          i18n: { defaultLocale: { country: 'US', language: 'EN' } },
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

describe('captureSubrequestHeaders', () => {
  const SHOPIFY_COOKIES = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure']

  function fromShopify(cookies = SHOPIFY_COOKIES) {
    const headers = new Headers({ 'content-type': 'application/json' })

    for (const cookie of cookies) headers.append('set-cookie', cookie)

    return headers
  }

  function request(method: string) {
    runtimeConfig._shopify = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, i18n: { defaultLocale: { country: 'US', language: 'EN' } } }

    const event = createTestEvent({ method, path: '/api/subscribe', headers: { host: 'shop.test', cookie: '_shopify_essential=old' } })

    event.node.res.setHeader('content-type', 'application/json')

    return event
  }

  it('hands Shopify\'s cookies to the response of a POST request, as Hydrogen does for its own requests', async () => {
    const event = request('POST')

    await captureSubrequestHeaders(event, fromShopify())

    applyShopifyResponseHeaders(event)

    expect(getSetCookieHeaders(event)).toEqual(SHOPIFY_COOKIES)
  })

  it.each(['GET', 'HEAD'])('leaves a %s request without a request context, since Hydrogen never hands cookies to one', async (method) => {
    const event = request(method)

    await captureSubrequestHeaders(event, fromShopify())

    expect(event.context.shopifyRequestContext).toBeUndefined()
  })

  it('leaves a request without a request context when Shopify sets no cookies', async () => {
    const event = request('POST')

    await captureSubrequestHeaders(event, fromShopify([]))

    expect(event.context.shopifyRequestContext).toBeUndefined()
  })
})
