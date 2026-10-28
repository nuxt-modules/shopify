import { describe, expect, it } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'
import { createRequestSessionManager, isShopifyEndpoint, toShopifyRequest } from '#src/runtime/server/utils/shopify-routes'

describe('isShopifyEndpoint', () => {
  it.each([
    `/api/${API_VERSION}/graphql.json`,
    '/api/unstable/graphql.json',
    '/__shopify',
    '/__shopify/storefront/standard-events',
    '/cart.js',
    '/cart/add.js',
    '/de-de/cart/change.json',
    '/.well-known/ucp',
    '/.well-known/apple-developer-merchantid-domain-association',
    '/.well-known/shopify/fec/produce',
    '/api/mcp',
    '/api/ucp/mcp',
  ])('serves %s through Shopify', (pathname) => {
    expect(isShopifyEndpoint(pathname)).toBe(true)
  })

  it.each([
    '/',
    '/checkout',
    '/account/login',
    '/cart',
    '/cart/add',
    '/cart/123:1',
    '/buy/shirt:1',
    '/products/shirt',
    '/api/cart',
    `/api/${API_VERSION}/other.json`,
    '/.well-known/security.txt',
  ])('leaves %s to the app', (pathname) => {
    expect(isShopifyEndpoint(pathname)).toBe(false)
  })
})

describe('toShopifyRequest', () => {
  it('forwards only Shopify\'s cookies', () => {
    const event = createTestEvent({
      path: `/api/${API_VERSION}/graphql.json`,
      headers: {
        host: 'shop.test',
        cookie: 'shopify-customer-account=secret; _shopify_analytics=abc',
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
})

describe('createRequestSessionManager', () => {
  it('keeps values for the current request only', async () => {
    const event = createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } })

    const session = createRequestSessionManager(event)

    await session.setSessionItem('cartId', 'gid://shopify/Cart/1')

    expect(await session.getSessionItem('cartId')).toBe('gid://shopify/Cart/1')
    expect(await createRequestSessionManager(event).getSessionItem('cartId')).toBeUndefined()
    expect(await session.getSessionOrigin()).toBe('http://shop.test')
  })
})
