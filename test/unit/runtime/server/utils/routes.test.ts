import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { getShopifyScriptTags } from '@shopify/hydrogen'
import { defu } from 'defu'
import { resolveModulePath } from 'exsolve'
import { describe, expect, it, vi } from 'vitest'

import { CUSTOMER_ACCOUNT_ROUTES } from '#src/runtime/utils/session'
import { STOREFRONT_ROUTES } from '#src/utils/routes'
import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

const { getPublicRequestURL, isShopifyApiProxyPath, isShopifyEndpoint, toShopifyRequest }
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
