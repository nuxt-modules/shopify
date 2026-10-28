import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getResponseHeader } from '#test/helpers/event'

const runtimeConfig = {
  _shopify: {
    name: 'my-shop',
    clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: '' } },
    analytics: { storefrontId: '123' },
  },
}

const { createShopifyRequestContext, createStorefrontClient, handleShopifyRoutes } = vi.hoisted(() => ({
  createShopifyRequestContext: vi.fn((options: unknown) => ({ options })),
  createStorefrontClient: vi.fn((options: unknown) => ({ options })),
  handleShopifyRoutes: vi.fn<() => Promise<Response> | null>(() => null),
}))

vi.mock('@shopify/hydrogen', () => ({ createShopifyRequestContext, createStorefrontClient, handleShopifyRoutes }))

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

const handler = (await import('#src/runtime/server/middleware/shopify-routes')).default

beforeEach(() => {
  vi.clearAllMocks()

  runtimeConfig._shopify.analytics = { storefrontId: '123' }
})

describe('shopify routes middleware', () => {
  it('leaves app paths to the app', async () => {
    await expect(handler(createTestEvent({ path: '/checkout', headers: { host: 'shop.test' } }))).resolves.toBeUndefined()

    expect(handleShopifyRoutes).not.toHaveBeenCalled()
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

  it('serves Shopify endpoints in the configured default market', async () => {
    await handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))

    expect(createShopifyRequestContext).toHaveBeenLastCalledWith(expect.objectContaining({ i18n: { country: 'US', language: 'EN' } }))

    Object.assign(runtimeConfig._shopify.analytics, { country: 'DE', language: 'DE' })

    await handler(createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } }))

    expect(createShopifyRequestContext).toHaveBeenLastCalledWith(expect.objectContaining({ i18n: { country: 'DE', language: 'DE' } }))
  })

  it('passes requests Shopify does not handle on to the app', async () => {
    const event = createTestEvent({ path: '/cart.js', headers: { host: 'shop.test' } })

    await expect(handler(event)).resolves.toBeUndefined()

    expect(handleShopifyRoutes).toHaveBeenCalledTimes(1)
    expect(event.handled).toBe(false)
  })
})
