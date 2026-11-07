import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createPredictiveSearchServerHandlers, createShopifyRequestContext, getShopifyScriptTags, handleShopifyRoutes } from '@shopify/hydrogen'
import { defu } from 'defu'
import { resolveModulePath } from 'exsolve'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER_ACCOUNT_ROUTES, STOREFRONT_ROUTES } from '#src/utils/routes'
import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getResponseHeader, getSetCookieHeaders } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('#src/runtime/utils/log', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}))

const { applyShopifyResponseHeaders, createShopifyStorefrontClient, getPublicRequestURL, getShopifyRequestContext, isShopifyApiProxyPath, isShopifyEndpoint, resolveShopifyMarket, toShopifyRequest }
  = await import('#src/runtime/server/utils/routes')

const hydrogenRoot = dirname(resolveModulePath('@shopify/hydrogen/package.json', { from: import.meta.url }))
const hydrogenUrl: Record<string, unknown> = await import(pathToFileURL(join(hydrogenRoot, 'dist/core/url.mjs')).href)

const radix3 = await import(resolveModulePath('radix3', { from: resolveModulePath('nitropack', { from: import.meta.url }) }))

const routeRules = radix3.toRouteMatcher(radix3.createRouter({
  routes: {
    '/**': { swr: 60 },
    ...Object.fromEntries([...STOREFRONT_ROUTES, ...CUSTOMER_ACCOUNT_ROUTES].map(route => [route, { cache: false, swr: false, isr: false }])),
  },
}))

const routeRulesFor = (path: string) => defu({}, ...routeRules.matchAll(path).reverse())

const ALL_ROUTES = { storefront: true, customerAccount: true }

const HYDROGEN_ROUTE_SAMPLES: Record<string, string[]> = {
  SFAPI_RE: [`/api/${API_VERSION}/graphql.json`, '/api/unstable/graphql.json'],
  SHOPIFY_API_PROXY_RE: ['/__shopify/api/collect'],
  AJAX_CART_RE: ['/cart.js', '/cart.json', '/cart/add', '/cart/update.js', '/de-de/cart.js', '/en/cart/change.json'],
  CHECKOUT_RE: ['/checkout'],
  BUY_PERMALINK_RE: ['/buy/sku-1:1', '/buy/~token:2', '/buy/~a1-b2:3,shirt:1'],
  UCP_RE: ['/.well-known/ucp'],
  WELL_KNOWN_RE: ['/.well-known/apple-developer-merchantid-domain-association', '/.well-known/shopify/fec/produce'],
  MCP_RE: ['/api/mcp'],
  UCP_MCP_RE: ['/api/ucp/mcp'],
}

describe('isShopifyEndpoint', () => {
  it.each([
    '/account/login',
    '/account/authorize',
    '/account/refresh',
    '/account/logout',
  ])('serves %s through Shopify\'s customer account handlers', (pathname) => {
    expect(isShopifyEndpoint(pathname, { storefront: false, customerAccount: true })).toBe(true)
    expect(isShopifyEndpoint(pathname, { storefront: true, customerAccount: false })).toBe(false)
  })

  it.each([
    '/cart.js',
    '/checkout',
    '/api/cart',
    '/api/mcp',
  ])('leaves %s to the app without a storefront', (pathname) => {
    expect(isShopifyEndpoint(pathname, { storefront: false, customerAccount: true })).toBe(false)
  })

  it.each([
    '/',
    '/checkout/thank-you',
    '/account',
    '/account/orders',
    '/account/login/callback',
    '/cart',
    '/cart/123',
    '/cart/123:0x',
    '/buy/shirt:0',
    '/products/shirt',
    '/api/cart/add',
    `/api/${API_VERSION}/other.json`,
    '/api/1999-01/graphql.json',
    '/.well-known/security.txt',
  ])('leaves %s to the app', (pathname) => {
    expect(isShopifyEndpoint(pathname, ALL_ROUTES)).toBe(false)
  })
})

describe('Hydrogen\'s routes', () => {
  it('are all known to the module, so a Hydrogen release with a new route fails here first', () => {
    const patterns = Object.entries(hydrogenUrl).filter(([, value]) => value instanceof RegExp).map(([name]) => name)

    expect(patterns.sort()).toStrictEqual(Object.keys(HYDROGEN_ROUTE_SAMPLES).sort())
  })

  it.each(Object.entries(HYDROGEN_ROUTE_SAMPLES).flatMap(([pattern, paths]) => paths.map(path => [pattern, path])))('%s %s reaches Hydrogen and is never cached', (pattern, path) => {
    expect((hydrogenUrl[pattern!] as RegExp).test(path!)).toBe(true)
    expect(isShopifyEndpoint(path!, { storefront: true, customerAccount: false })).toBe(true)
    expect(routeRulesFor(path!)).toMatchObject({ cache: false, swr: false, isr: false })
  })

  it('lets Shopify\'s performance beacon through, at the path Hydrogen\'s script tags send it to', () => {
    const { scripts } = getShopifyScriptTags({ shop: { shopId: 'gid://shopify/Shop/1', storefrontId: '1', myshopifyDomain: 'shop.myshopify.com' }, shopifyAnalytics: true })
    const beacon = scripts.map(script => script.attributes?.['data-shs-beacon-endpoint']).find(Boolean)

    expect(isShopifyEndpoint(String(beacon), { storefront: true, customerAccount: false })).toBe(true)
    expect(routeRulesFor(String(beacon))).toMatchObject({ cache: false, swr: false, isr: false })
  })

  it.each(['/__shopify', '/__shopify/', '/__shopify/products/shirt', '/__shopify/apps/reviews', '/__shopify/api/unstable/graphql.json'])('keeps %s, which Hydrogen would fetch from the online store, away from Hydrogen', (path) => {
    expect((hydrogenUrl.SHOPIFY_API_PROXY_RE as RegExp).test(path)).toBe(true)
    expect(isShopifyApiProxyPath(path)).toBe(true)
    expect(isShopifyEndpoint(path, { storefront: true, customerAccount: true })).toBe(false)
    expect(routeRulesFor(path)).toStrictEqual({ swr: 60 })
  })

  it.each(['/cart/1:2', '/cart/1:2,3:4'])('the cart permalink %s reaches Hydrogen and is never cached', (path) => {
    expect((hydrogenUrl.isHydrogenServerHandoffPath as (pathname: string) => boolean)(path)).toBe(true)
    expect(isShopifyEndpoint(path, { storefront: true, customerAccount: false })).toBe(true)
    expect(routeRulesFor(path)).toMatchObject({ cache: false, swr: false, isr: false })
  })

  it.each(['/api/cart', '/api/predictive-search'])('%s, a Hydrogen route handler, reaches Hydrogen and is never cached', (path) => {
    expect(isShopifyEndpoint(path, { storefront: true, customerAccount: false })).toBe(true)
    expect(routeRulesFor(path)).toMatchObject({ cache: false, swr: false, isr: false })
  })

  it.each(Object.values(hydrogenUrl.CUSTOMER_ACCOUNT_PATHS as Record<string, string>))('%s reaches Hydrogen and is never cached', (path) => {
    expect(isShopifyEndpoint(path, { storefront: false, customerAccount: true })).toBe(true)
    expect(routeRulesFor(path)).toMatchObject({ cache: false, swr: false, isr: false })
  })

  it.each(['/', '/products/shirt', '/account', '/account/orders', '/collections/all', '/cart', '/de-de/cart'])('leaves the app page %s to the app\'s own route rules', (path) => {
    expect(isShopifyEndpoint(path, { storefront: true, customerAccount: true })).toBe(false)
    expect(routeRulesFor(path)).toStrictEqual({ swr: 60 })
  })
})

describe('toShopifyRequest', () => {
  it('forwards only Shopify\'s cookies', () => {
    const event = createTestEvent({
      path: `/api/${API_VERSION}/graphql.json`,
      headers: {
        host: 'shop.test',
        cookie: '__Host-session=secret; _shopify_analytics=abc',
      },
    })

    expect(toShopifyRequest(event).headers.get('cookie')).toBe('_shopify_analytics=abc')
  })

  it('drops the cookie header when no Shopify cookie is present', () => {
    const event = createTestEvent({ path: '/cart.js', headers: { host: 'shop.test', cookie: 'theme=dark' } })

    expect(toShopifyRequest(event).headers.has('cookie')).toBe(false)
  })

  it('keeps the request method, url and body', async () => {
    const event = createTestEvent({ method: 'POST', path: `/api/${API_VERSION}/graphql.json`, headers: { host: 'shop.test' }, body: { query: '{ shop { id } }' } })

    const request = toShopifyRequest(event)

    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe(`/api/${API_VERSION}/graphql.json`)
    await expect(request.json()).resolves.toStrictEqual({ query: '{ shop { id } }' })
  })

  it('adds the public access token unless the request already carries one', () => {
    const request = (headers: Record<string, string> = {}) =>
      toShopifyRequest(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test', ...headers } }), 'public-token')

    expect(request().headers.get('x-shopify-storefront-access-token')).toBe('public-token')
    expect(request({ 'x-shopify-storefront-access-token': 'client-token' }).headers.get('x-shopify-storefront-access-token')).toBe('client-token')
  })

  it('drops credentials and platform headers before handing the request to Shopify', () => {
    const headers = toShopifyRequest(createTestEvent({
      path: '/__shopify/api/collect',
      headers: {
        'host': 'shop.test',
        'authorization': 'Basic c3RhZ2luZzpzZWNyZXQ=',
        'x-vercel-oidc-token': 'platform-jwt',
        'cf-access-jwt-assertion': 'access-jwt',
        'x-amzn-oidc-accesstoken': 'alb-token',
        'x-ms-client-principal': 'azure-principal',
        'x-forwarded-client-cert': 'client-cert',
        'x-goog-iap-jwt-assertion': 'iap-jwt',
        'x-goog-authenticated-user-email': 'accounts.google.com:staff@shop.test',
        'x-forwarded-access-token': 'oauth2-proxy-token',
        'x-auth-request-access-token': 'oauth2-proxy-request-token',
        'x-pomerium-jwt-assertion': 'pomerium-jwt',
        'user-agent': 'Browser',
        'accept-language': 'de',
        'x-forwarded-for': '203.0.113.9',
      },
    })).headers

    for (const name of ['authorization', 'x-vercel-oidc-token', 'cf-access-jwt-assertion', 'x-amzn-oidc-accesstoken', 'x-ms-client-principal', 'x-forwarded-client-cert', 'x-goog-iap-jwt-assertion', 'x-goog-authenticated-user-email', 'x-forwarded-access-token', 'x-auth-request-access-token', 'x-pomerium-jwt-assertion']) {
      expect(headers.has(name), name).toBe(false)
    }

    expect(headers.get('user-agent')).toBe('Browser')
    expect(headers.get('accept-language')).toBe('de')
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.9')
  })

  it('keeps the authorization header for the UCP MCP endpoint only', () => {
    const headers = toShopifyRequest(createTestEvent({
      method: 'POST',
      path: '/api/ucp/mcp',
      headers: { 'host': 'shop.test', 'authorization': 'Bearer agent-token', 'x-vercel-oidc-token': 'platform-jwt' },
      body: {},
    })).headers

    expect(headers.get('authorization')).toBe('Bearer agent-token')
    expect(headers.has('x-vercel-oidc-token')).toBe(false)
  })
})

describe('getPublicRequestURL', () => {
  const behindProxy = () => createTestEvent({ path: '/account/login?return_to=/account', headers: { host: '127.0.0.1:3000' } })

  it('uses the request URL by default', () => {
    runtimeConfig._shopify = {}

    expect(getPublicRequestURL(behindProxy()).href).toBe('http://127.0.0.1:3000/account/login?return_to=/account')
  })

  it('uses the configured origin when one is set', () => {
    runtimeConfig._shopify = { origin: 'https://shop.example.com/ignored-path' }

    expect(getPublicRequestURL(behindProxy()).href).toBe('https://shop.example.com/account/login?return_to=/account')
  })

  it('keeps the configured origin for a path that resolves to two leading slashes', () => {
    runtimeConfig._shopify = { origin: 'https://shop.example.com' }

    const url = getPublicRequestURL(createTestEvent({ path: '/.//evil.example/checkout?variant=1', headers: { host: '127.0.0.1:3000' } }))

    expect(url.host).toBe('shop.example.com')
    expect(url.pathname).toBe('//evil.example/checkout')
  })

  it('hands Shopify the public URL, with the method and body intact', async () => {
    runtimeConfig._shopify = { origin: 'https://shop.example.com' }

    const request = toShopifyRequest(createTestEvent({ method: 'POST', path: `/api/${API_VERSION}/graphql.json`, headers: { host: '127.0.0.1:3000' }, body: { query: '{ shop { id } }' } }))

    expect(request.url).toBe(`https://shop.example.com/api/${API_VERSION}/graphql.json`)
    expect(request.method).toBe('POST')
    await expect(request.json()).resolves.toStrictEqual({ query: '{ shop { id } }' })

    runtimeConfig._shopify = {}
  })
})

describe('resolveShopifyMarket', () => {
  const event = (path = '/cart.js') => createTestEvent({ path, headers: { host: 'shop.test' } })

  const configured = { clients: {}, defaultMarket: { country: 'DE', language: 'DE' } } as never

  const lookUpWith = async (country: string, language: string) => {
    const fetchMock = vi.fn(async () => Response.json({
      data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: country, currency: { isoCode: 'EUR' } }, language: { isoCode: language } } },
    }))

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/routes')

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

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/routes')
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

    const { resolveShopifyMarket } = await import('#src/runtime/server/utils/routes')
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
    const storefrontClient = createShopifyStorefrontClient(requestContext, config as never)

    expect(requestContext.buyerIp).toBe('203.0.113.7')
    expect(storefrontClient.type).toBe('private')
    expect(storefrontClient.storefrontId).toBe('42')
  })

  it('uses a private storefront client without buyer context when the buyer\'s IP is unknown', async () => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private' } }, defaultMarket: { country: 'DE', language: 'DE' } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(requestContext.buyerIp).toBeUndefined()
    expect(createShopifyStorefrontClient(requestContext, config as never).type).toBe('private_no_buyer_context')
  })

  it.each([
    ['only a public token', { publicAccessToken: 'public' }],
    ['the mock shop', { mock: true, privateAccessToken: 'private' }],
  ])('keeps a public storefront client for %s', async (_, storefront) => {
    const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, ...storefront } }, defaultMarket: { country: 'DE', language: 'DE' } }

    runtimeConfig._shopify = config

    const requestContext = await getShopifyRequestContext(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' }, remoteAddress: '203.0.113.7' }))

    expect(createShopifyStorefrontClient(requestContext, config as never).type).toBe('public')
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

describe('Shopify\'s cookies from Hydrogen\'s storefront client', () => {
  const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public' } }, defaultMarket: { country: 'US', language: 'EN' } }

  const SHOPIFY_COOKIES = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure', '_shopify_marketing=m; Path=/; HttpOnly; Secure']

  const predictiveSearch = { data: { predictiveSearch: { articles: [], collections: [], pages: [], products: [], queries: [] } } }

  function stubStorefrontApi(body: unknown) {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const headers = new Headers({ 'content-type': 'application/json' })

      for (const cookie of SHOPIFY_COOKIES) headers.append('set-cookie', cookie)

      return new Response(JSON.stringify(body), { headers })
    }))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps them out of a predictive search response, as Hydrogen\'s own response headers do for a GET request', async () => {
    runtimeConfig._shopify = config

    stubStorefrontApi(predictiveSearch)

    const event = createTestEvent({ path: '/api/predictive-search?q=shirt', headers: { host: 'shop.test' } })
    const requestContext = await getShopifyRequestContext(event)

    const response = await handleShopifyRoutes({
      request: toShopifyRequest(event),
      requestContext,
      storefrontClient: createShopifyStorefrontClient(requestContext, config as never),
      routeTemplates: {},
      handlers: [createPredictiveSearchServerHandlers()],
    })

    expect(response?.status).toBe(200)
    expect(response?.headers.getSetCookie()).toEqual([])
  })

  it('still hands them over through Hydrogen\'s response headers when Hydrogen allows it', async () => {
    runtimeConfig._shopify = config

    stubStorefrontApi({ data: { shop: { id: '1' } } })

    const event = createTestEvent({ method: 'POST', path: '/api/cart', headers: { host: 'shop.test', cookie: '_shopify_essential=e' } })
    const requestContext = await getShopifyRequestContext(event)

    const result = await createShopifyStorefrontClient(requestContext, config as never).graphql('query { shop { id } }')

    expect(result.headers.getSetCookie()).toEqual([])

    const headers = new Headers({ 'content-type': 'application/json' })

    requestContext.applyResponseHeaders(headers)

    expect(headers.getSetCookie()).toEqual(SHOPIFY_COOKIES)
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
