import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { SHOP_ID, createShopifyConfig } from '#test/helpers/customer-account'
import { setResponseHeaders } from 'h3'

import { createTestEvent, getResponseHeader, getSetCookieHeaders } from '#test/helpers/event'
import { createLoggerStub } from '#test/helpers/logger'

const runtimeConfig = {
  _shopify: {
    name: 'my-shop',
    shopId: SHOP_ID as string | undefined,
    storefrontId: '123',
    clients: { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: '' } } as Record<string, unknown>,
    defaultMarket: undefined as Record<string, unknown> | undefined,
    cart: undefined as Record<string, unknown> | undefined,
    predictiveSearch: undefined as Record<string, unknown> | undefined,
    analytics: {} as Record<string, unknown> | false,
    routeTemplates: { product: '/product/:productHandle' },
  },
}

const {
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createCustomerAccountServerHandlers,
  createShopifyRequestContext,
  createShopifyRouteHandler,
  createStorefrontClient,
  handleShopifyRoutes,
} = vi.hoisted(() => {
  const createShopifyRouteHandler = (pathname: string, method: string, handler: () => unknown) => Object.assign(handler, { pathname, method })

  return {
    createCartServerHandlers: vi.fn((options?: { customerSession?: unknown }) => ({
      cart: true,
      synced: !!options?.customerSession,
      post: createShopifyRouteHandler('/api/cart', 'POST', vi.fn()),
    })),
    createPredictiveSearchServerHandlers: vi.fn(() => ({ predictiveSearch: true })),
    createCustomerAccountServerHandlers: vi.fn((_options: Record<string, unknown>) => ({
      login: createShopifyRouteHandler('/account/login', 'GET', vi.fn()),
      authorize: createShopifyRouteHandler('/account/authorize', 'GET', vi.fn()),
      refresh: createShopifyRouteHandler('/account/refresh', 'GET', vi.fn()),
      logout: createShopifyRouteHandler('/account/logout', 'POST', vi.fn()),
    })),
    createShopifyRequestContext: vi.fn((options: unknown) => ({ options, markResponseAsPersonalized: vi.fn(), applyResponseHeaders: vi.fn() })),
    createShopifyRouteHandler,
    createStorefrontClient: vi.fn((options: unknown) => ({ options })),
    handleShopifyRoutes: vi.fn<(options: Record<string, unknown>) => Promise<Response> | null>(() => null),
  }
})

vi.mock('@shopify/hydrogen', () => ({
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createShopifyRequestContext,
  createShopifyRouteHandler,
  createStorefrontClient,
  handleShopifyRoutes,
}))

vi.mock('@shopify/hydrogen/customer-account', async () => ({
  ...await vi.importActual<Record<string, unknown>>('@shopify/hydrogen/customer-account'),
  createCustomerAccountServerHandlers,
}))

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

const logError = vi.fn()

vi.mock('#src/runtime/utils/shop', () => ({
  createShopResolver: () => () => Promise.resolve({ shop: {}, i18n: { country: 'US', language: 'EN' } }),
}))

vi.mock('#src/runtime/server/utils/log', () => ({
  createLogger: () => createLoggerStub({ error: logError }),
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules: () => ({}),
  useNitroApp: () => ({ hooks: { callHook: vi.fn() } }),
  useStorage: vi.fn(),
}))

const handler = (await import('#src/runtime/server/middleware/routes')).default

const PLAIN_CART = expect.objectContaining({ cart: true, synced: false })

const PREDICTIVE_SEARCH = { predictiveSearch: true }

const ACCOUNT_ROUTES = expect.objectContaining({
  login: expect.any(Function),
  authorize: expect.any(Function),
  refresh: expect.any(Function),
  logout: expect.any(Function),
})

const SESSION_MANAGER = expect.objectContaining({ getSessionItem: expect.any(Function), setSessionItem: expect.any(Function) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()

  runtimeConfig._shopify.analytics = {}
  runtimeConfig._shopify.shopId = SHOP_ID
  runtimeConfig._shopify.defaultMarket = undefined
  runtimeConfig._shopify.cart = undefined
  runtimeConfig._shopify.predictiveSearch = undefined
  runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: '' } }
})

function enableCustomerAccount() {
  runtimeConfig._shopify.clients.customerAccount = createShopifyConfig().clients.customerAccount
}

describe('routes middleware', () => {
  it('leaves app paths to the app', async () => {
    await expect(handler(createTestEvent({ path: '/products/shirt', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it('hands only Shopify\'s performance beacon to Hydrogen\'s `/__shopify` proxy, so no theme or app page loads on the storefront\'s origin', async () => {
    const send = (method: string, path: string) => handler(createTestEvent({ method, path, headers: { host: 'shop.test' } }))

    for (const [method, path] of [
      ['GET', '/__shopify'],
      ['GET', '/__shopify/products/shirt'],
      ['GET', '/__shopify/products/shirt?variant=1'],
      ['GET', '/__shopify/apps/reviews'],
      ['GET', '/__shopify/api/collect'],
      ['POST', '/__shopify/api/collect/'],
      ['POST', '/__shopify/pages/contact'],
    ]) {
      await expect(send(method!, path!)).resolves.toBeUndefined()
    }

    expect(handleShopifyRoutes).not.toHaveBeenCalled()

    await send('POST', '/__shopify/api/collect')

    expect(handleShopifyRoutes).toHaveBeenCalledOnce()
  })

  it('sends Shopify\'s response from a public client for the configured store', async () => {
    handleShopifyRoutes.mockReturnValueOnce(Promise.resolve(new Response('{"data":{"shop":{"id":"1"}}}', {
      status: 201,
      headers: { 'x-request-id': 'shopify-request' },
    })))

    const event = createTestEvent({ method: 'POST', path: `/api/${OTHER_API_VERSION}/graphql.json`, headers: { host: 'shop.test' }, body: { query: '{ shop { id } }' } })
    const write = vi.spyOn(event.node.res, 'write')

    await handler(event)

    expect(createStorefrontClient).toHaveBeenCalledWith(expect.objectContaining({
      type: 'public',
      config: {
        storeDomain: 'https://my-shop.myshopify.com',
        publicStorefrontToken: undefined,
        storefrontId: '123',
        apiVersion: API_VERSION,
      },
    }))
    expect(event.node.res.statusCode).toBe(201)
    expect(getResponseHeader(event, 'x-request-id')).toBe('shopify-request')
    expect(Buffer.concat(write.mock.calls.map(([chunk]) => chunk)).toString()).toBe('{"data":{"shop":{"id":"1"}}}')
  })

  it('passes requests Shopify does not handle on to the app', async () => {
    const event = createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } })

    await expect(handler(event)).resolves.toBeUndefined()

    expect(handleShopifyRoutes).toHaveBeenCalledTimes(1)
    expect(event.handled).toBe(false)
  })

  it('leaves the customer account routes to the app when no customer account client is configured', async () => {
    await expect(handler(createTestEvent({ path: '/account/login', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it.each([
    ['the cart route', 'only a storefront client is configured', 'GET', '/api/cart', { analytics: false }],
    ['the Storefront API proxy', 'only a storefront client is configured', 'POST', `/api/${API_VERSION}/graphql.json`, { analytics: false }],
    ['the checkout', 'only a storefront client is configured', 'GET', '/checkout', { analytics: false }],
    ['predictive search', 'only a storefront client is configured', 'GET', '/api/predictive-search?q=shirt', { analytics: false }],
    ['the endpoints of Shopify\'s scripts', 'only analytics is on', 'GET', '/cart.js', { clients: {}, defaultMarket: { country: 'US', language: 'EN' } }],
  ])('serves %s with Hydrogen\'s handlers when %s', async (_, __, method, path, config) => {
    Object.assign(runtimeConfig._shopify, config)

    await handler(createTestEvent({ method, path, headers: { host: 'shop.test' } }))

    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.objectContaining({ handlers: [PLAIN_CART, PREDICTIVE_SEARCH] }))
    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.not.objectContaining({ sessionManager: expect.anything() }))
  })

  it('leaves the storefront endpoints to the app without a storefront client or analytics, even with a customer account client', async () => {
    runtimeConfig._shopify.analytics = false
    runtimeConfig._shopify.clients = {}

    enableCustomerAccount()

    await expect(handler(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()
    await expect(handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it('leaves Shopify\'s storefront paths and variant links to the app when the storefront client turns its routes off', async () => {
    runtimeConfig._shopify.analytics = false
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: false, publicAccessToken: '' } }

    for (const [method, path] of [['GET', '/api/cart'], ['POST', `/api/${API_VERSION}/graphql.json`], ['GET', '/checkout'], ['GET', '/cart.js'], ['GET', '/product/shirt?variant=123']]) {
      await expect(handler(createTestEvent({ method, path, headers: { host: 'shop.test' } }))).resolves.toBeUndefined()
    }

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it('keeps the customer account routes and the server cache, without Shopify\'s scripts or redirects, when the storefront client turns its routes off', async () => {
    runtimeConfig._shopify.analytics = false
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: false, publicAccessToken: 'public', cache: { server: {}, presets: {} } } }

    enableCustomerAccount()

    const event = createTestEvent({ path: '/products/shirt', headers: { host: 'shop.test' } })

    await handler(event)

    expect(Object.keys(event.context._shopify!).sort()).toStrictEqual(['customerAccount', 'storefrontCache'])

    await handler(createTestEvent({ path: '/account/login', headers: { host: 'shop.test' } }))

    expect(handleShopifyRoutes).toHaveBeenCalledOnce()
  })

  it('leaves the cart out of the customer session in development, where Hydrogen cannot share it', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)

    enableCustomerAccount()

    await handler(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(createCustomerAccountServerHandlers).toHaveBeenCalledWith(expect.not.objectContaining({ cartServerHandlers: expect.anything() }))
    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.objectContaining({
      handlers: [PLAIN_CART, ACCOUNT_ROUTES],
      sessionManager: SESSION_MANAGER,
    }))
  })

  it.each([
    ['the cart', '/api/cart', false],
    ['the cart that follows the customer session', '/api/cart', true],
    ['the AJAX cart', '/cart/add.js', false],
    ['the AJAX cart', '/cart/update.json', false],
  ])('refuses a post to %s at %s from another site before Hydrogen sees it', async (_, path, customerAccount) => {
    if (customerAccount) enableCustomerAccount()

    const event = createTestEvent({ method: 'POST', path, headers: { 'host': 'shop.test', 'origin': 'https://evil.example', 'sec-fetch-site': 'cross-site' } })

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it.each([
    ['a cart read from a visitor who arrived from another site, as the cart page asks for it while rendering on the server', 'GET', '/api/cart', 'cross-site'],
    ['an AJAX cart read from another site', 'GET', '/cart.js', 'cross-site'],
    ['a cart post from the app\'s own pages', 'POST', '/api/cart', 'same-origin'],
    ['an AJAX cart post from the app\'s own pages', 'POST', '/cart/add.js', 'same-origin'],
  ])('serves %s', async (_, method, path, site) => {
    await handler(createTestEvent({ method, path, headers: { 'host': 'shop.test', 'sec-fetch-site': site } }))

    expect(handleShopifyRoutes).toHaveBeenCalledOnce()
  })

  it('proxies a mocked storefront to mock.shop', async () => {
    runtimeConfig._shopify.analytics = false
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, mock: true, proxy: true } }

    await handler(createTestEvent({ method: 'POST', path: `/api/${API_VERSION}/graphql.json`, headers: { host: 'shop.test' }, body: { query: '{ shop { id } }' } }))

    expect(createStorefrontClient).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ storeDomain: 'https://mock.shop' }),
    }))
  })

  it('keeps serving the storefront endpoints when the customer account is misconfigured', async () => {
    vi.stubEnv('NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD', '')

    runtimeConfig._shopify.shopId = undefined
    runtimeConfig._shopify.clients.customerAccount = {
      ...createShopifyConfig().clients.customerAccount,
      session: {},
    }

    await expect(handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.objectContaining({ handlers: [PLAIN_CART, PREDICTIVE_SEARCH] }))
    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.not.objectContaining({ sessionManager: expect.anything() }))
  })

  it('keeps the cart route working without the customer session when the customer account is misconfigured', async () => {
    vi.stubEnv('NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD', '')

    runtimeConfig._shopify.clients.customerAccount = { ...createShopifyConfig().clients.customerAccount, session: {} }

    vi.resetModules()

    const handler = (await import('#src/runtime/server/middleware/routes')).default

    await handler(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))
    await handler(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(handleShopifyRoutes).toHaveBeenLastCalledWith(expect.objectContaining({ handlers: [PLAIN_CART, PREDICTIVE_SEARCH] }))
    expect(handleShopifyRoutes).toHaveBeenLastCalledWith(expect.not.objectContaining({ sessionManager: expect.anything() }))
    expect(logError).toHaveBeenCalledOnce()

    await expect(handler(createTestEvent({ path: '/account/login', headers: { host: 'shop.test' } })))
      .rejects.toMatchObject({ statusCode: 500 })
  })

  it('hands Hydrogen the request with the public access token, so its Storefront API proxy works for a browser that sends none', async () => {
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public-token' } }

    await handler(createTestEvent({ method: 'POST', path: `/api/${API_VERSION}/graphql.json`, headers: { host: 'shop.test' }, body: { query: '{ shop { id } }' } }))

    const { request } = handleShopifyRoutes.mock.calls[0]![0] as { request: Request }

    expect(request.headers.get('x-shopify-storefront-access-token')).toBe('public-token')
  })

  it('serves the cart of an app without customer accounts, without reporting a misconfigured customer account', async () => {
    vi.resetModules()

    const handler = (await import('#src/runtime/server/middleware/routes')).default

    await handler(createTestEvent({ method: 'POST', path: '/api/cart', headers: { 'host': 'shop.test', 'sec-fetch-site': 'same-origin' } }))

    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.objectContaining({ handlers: [PLAIN_CART, PREDICTIVE_SEARCH] }))
    expect(logError).not.toHaveBeenCalled()
  })

  it('exposes no customer account without a customer account client', async () => {
    const event = createTestEvent({ path: '/account', headers: { host: 'shop.test' } })

    await handler(event)

    expect(event.context._shopify?.customerAccount).toBeUndefined()
  })

  it('hands Hydrogen the app\'s route templates', async () => {
    await handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))

    expect(handleShopifyRoutes).toHaveBeenCalledWith(expect.objectContaining({ routeTemplates: { product: '/product/:productHandle' } }))
  })

  it('lets Hydrogen answer variant links on any page, for analytics without a storefront client too', async () => {
    runtimeConfig._shopify.defaultMarket = { country: 'US', language: 'EN' }
    runtimeConfig._shopify.clients = {}

    await handler(createTestEvent({ method: 'HEAD', path: '/product/shirt?variant=123', headers: { host: 'shop.test' } }))

    expect(handleShopifyRoutes).toHaveBeenCalledOnce()
  })

  it('leaves a form post to a variant link to the app', async () => {
    const event = createTestEvent({ method: 'POST', path: '/product/shirt?variant=123', headers: { host: 'shop.test' } })

    await expect(handler(event)).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
    expect(event.context.shopifyRequestContext).toBeUndefined()
  })

  it('renders the page when a variant link has no market to look up, instead of failing it', async () => {
    runtimeConfig._shopify.clients = {}

    await expect(handler(createTestEvent({ path: '/product/shirt?variant=123', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
  })

  it('still fails a Shopify route that has no market to look up', async () => {
    runtimeConfig._shopify.clients = {}

    await expect(handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))).rejects.toMatchObject({ statusCode: 502 })
  })

  it('exposes Shopify\'s scripts to server rendering', async () => {
    const event = createTestEvent({ path: '/products/shirt', headers: { host: 'shop.test' } })

    await handler(event)

    expect(event.context._shopify?.scripts).toBeInstanceOf(Function)
  })

  it('hands the server cache to server rendering when the storefront client has one', async () => {
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public', cache: { server: {}, presets: {} } } }

    const event = createTestEvent({ path: '/products/shirt', headers: { host: 'shop.test' } })

    await handler(event)

    expect(event.context._shopify?.storefrontCache).toBeInstanceOf(Function)
  })

  it.each([
    ['its server cache turned off', { server: false, presets: {} }],
    ['no cache at all', false],
  ])('hands server rendering no server cache with %s', async (_, cache) => {
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public', cache } }

    const event = createTestEvent({ path: '/products/shirt', headers: { host: 'shop.test' } })

    await handler(event)

    expect(event.context._shopify?.storefrontCache).toBeUndefined()
  })

  it('keeps a Shopify response without cache headers of its own out of shared caches, whatever the route rules say', async () => {
    const { createShopifyRequestContext: createRequestContext } = await vi.importActual<typeof import('@shopify/hydrogen')>('@shopify/hydrogen')

    createShopifyRequestContext.mockImplementationOnce(createRequestContext as never)
    handleShopifyRoutes.mockReturnValueOnce(Promise.resolve(new Response(null, { status: 302, headers: { location: 'https://checkout.example/cart/c/1?key=secret' } })))

    const event = createTestEvent({ path: '/checkout', headers: { host: 'shop.test', cookie: 'cart=1' } })

    setResponseHeaders(event, { 'cache-control': 'public, s-maxage=600', 'cdn-cache-control': 'public, max-age=600' })

    await handler(event)

    expect(event.node.res.statusCode).toBe(302)
    expect(getResponseHeader(event, 'cache-control')).toBe('private, no-store, max-age=0, must-revalidate')
    expect(getResponseHeader(event, 'cdn-cache-control')).toBe('')
  })

  it('drops the CDN cache headers of the route rules from a response Shopify keeps private', async () => {
    const { createShopifyRequestContext: createRequestContext } = await vi.importActual<typeof import('@shopify/hydrogen')>('@shopify/hydrogen')

    createShopifyRequestContext.mockImplementationOnce(createRequestContext as never)
    handleShopifyRoutes.mockReturnValueOnce(Promise.resolve(new Response('{"cart":null}', { headers: { 'cache-control': 'private, no-store, max-age=0, must-revalidate' } })))

    const event = createTestEvent({ path: '/api/cart', headers: { host: 'shop.test', cookie: 'cart=1' } })

    setResponseHeaders(event, { 'cdn-cache-control': 'public, max-age=600', 'vercel-cdn-cache-control': 'max-age=600', 'surrogate-control': 'max-age=600' })

    await handler(event)

    expect(getResponseHeader(event, 'cache-control')).toBe('private, no-store, max-age=0, must-revalidate')
    expect(getResponseHeader(event, 'cdn-cache-control')).toBe('')
    expect(getResponseHeader(event, 'vercel-cdn-cache-control')).toBe('')
    expect(getResponseHeader(event, 'surrogate-control')).toBe('')
  })

  it('keeps the cache headers Shopify sent, and leaves the route rules\' CDN headers of a cacheable response alone', async () => {
    const { createShopifyRequestContext: createRequestContext } = await vi.importActual<typeof import('@shopify/hydrogen')>('@shopify/hydrogen')

    createShopifyRequestContext.mockImplementationOnce(createRequestContext as never)
    handleShopifyRoutes.mockReturnValueOnce(Promise.resolve(new Response('{}', { headers: { 'cache-control': 'public, max-age=60' } })))

    const event = createTestEvent({ path: '/.well-known/ucp', headers: { host: 'shop.test' } })

    setResponseHeaders(event, { 'cache-control': 'public, s-maxage=600', 'cdn-cache-control': 'public, s-maxage=600' })

    await handler(event)

    expect(getResponseHeader(event, 'cache-control')).toBe('public, max-age=60')
    expect(getResponseHeader(event, 'cdn-cache-control')).toBe('public, s-maxage=600')
  })

  it('sends each of Shopify\'s cookies once on a cart request that Hydrogen hands them to', async () => {
    const hydrogen = await vi.importActual<typeof import('@shopify/hydrogen')>('@shopify/hydrogen')

    createShopifyRequestContext.mockImplementationOnce(hydrogen.createShopifyRequestContext as never)
    createStorefrontClient.mockImplementationOnce(hydrogen.createStorefrontClient as never)
    createCartServerHandlers.mockImplementationOnce(hydrogen.createCartServerHandlers as never)
    handleShopifyRoutes.mockImplementationOnce(hydrogen.handleShopifyRoutes as never)

    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public' } }
    runtimeConfig._shopify.defaultMarket = { country: 'US', language: 'EN' }

    const cookies = ['_shopify_essential=e; Path=/; HttpOnly; Secure', '_shopify_analytics=a; Path=/; HttpOnly; Secure']

    vi.stubGlobal('fetch', vi.fn(async () => {
      const headers = new Headers({ 'content-type': 'application/json' })

      for (const cookie of cookies) headers.append('set-cookie', cookie)

      return new Response(JSON.stringify({ data: { cartLinesAdd: { cart: { id: 'gid://shopify/Cart/c1' }, userErrors: [], warnings: [] } } }), { headers })
    }))

    const event = createTestEvent({
      method: 'POST',
      path: '/api/cart',
      headers: { 'host': 'shop.test', 'x-forwarded-proto': 'https', 'cookie': '_shopify_essential=e; cart=c1' },
      body: { action: 'add', lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] },
    })

    await handler(event)

    expect(fetch).toHaveBeenCalled()
    expect(getSetCookieHeaders(event).filter(cookie => cookie.startsWith('_shopify_'))).toEqual(cookies)
  })

  it('hands the configured cart and predictive search options to Hydrogen\'s handlers', async () => {
    runtimeConfig._shopify.cart = { fragment: 'fragment CartFragment on Cart { note }' }
    runtimeConfig._shopify.predictiveSearch = { limit: 8 }

    await handler(createTestEvent({ path: '/api/predictive-search?q=shirt', headers: { host: 'shop.test' } }))

    expect(createCartServerHandlers).toHaveBeenCalledWith({ fragment: 'fragment CartFragment on Cart { note }' })
    expect(createPredictiveSearchServerHandlers).toHaveBeenCalledWith({ limit: 8 })
  })

  it('keeps the configured cart fragment in the cart that follows the customer session', async () => {
    enableCustomerAccount()
    runtimeConfig._shopify.cart = { fragment: 'fragment CartFragment on Cart { note }' }

    await handler(createTestEvent({ path: '/api/cart', headers: { host: 'shop.test' } }))

    expect(createCartServerHandlers).toHaveBeenCalledWith({ fragment: 'fragment CartFragment on Cart { note }', customerSession: expect.anything() })
  })
})
