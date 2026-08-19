import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const request = vi.fn()
const createShopifyClient = vi.fn((..._args: unknown[]) => ({ request }))
const getValidCustomerAccessToken = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('#src/runtime/utils/clients', () => ({
  createShopifyClient: (...args: unknown[]) => createShopifyClient(...args as []),
}))

vi.mock('#src/runtime/server/utils/customer-account/auth', () => ({
  getValidCustomerAccessToken: (...args: unknown[]) => getValidCustomerAccessToken(...args as []),
}))

vi.stubGlobal('__NUXT_DEV__', true)

const handler = (await import('#src/runtime/server/utils/explorer/proxy')).default

const query = '{ shop { name } }'

const explorerEvent = (client: string, headers: Record<string, string> = {}, body: unknown = { query }) =>
  createTestEvent({ method: 'POST', path: `/_explorer/proxy/${client}`, headers, body })

beforeEach(() => {
  vi.clearAllMocks()

  vi.stubGlobal('__NUXT_DEV__', true)

  request.mockResolvedValue({ data: { shop: { name: 'Test Shop' } } })
  getValidCustomerAccessToken.mockResolvedValue('Bearer customer-access-token')

  runtimeConfig._shopify = {
    name: 'test-shop',
    clients: {
      storefront: { apiVersion: '2026-01', publicAccessToken: 'public-token' },
      admin: { apiVersion: '2026-01', clientId: 'id', clientSecret: 'secret' },
      customerAccount: { apiVersion: '2026-01', clientId: 'id' },
    },
  }
})

describe('availability', () => {
  it('does not answer outside of dev', async () => {
    vi.stubGlobal('__NUXT_DEV__', false)

    await expect(handler(explorerEvent('storefront'))).resolves.toBeUndefined()
    expect(createShopifyClient).not.toHaveBeenCalled()
  })

  it('does not reach the client factory outside of dev', async () => {
    vi.stubGlobal('__NUXT_DEV__', false)

    await handler(explorerEvent('admin'))

    expect(request).not.toHaveBeenCalled()
  })

  it('answers in dev', async () => {
    await expect(handler(explorerEvent('storefront'))).resolves.toEqual({
      data: { shop: { name: 'Test Shop' } },
    })
  })
})

describe('request guarding', () => {
  it('rejects a cross-site request', async () => {
    await expect(handler(explorerEvent('admin', { 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 403 })

    expect(createShopifyClient).not.toHaveBeenCalled()
  })

  it('fails when the module configuration is missing', async () => {
    runtimeConfig._shopify = undefined

    await expect(handler(explorerEvent('storefront'))).rejects.toMatchObject({ statusCode: 500 })
  })

  it('rejects an unknown client type', async () => {
    await expect(handler(explorerEvent('billing'))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a body without a query', async () => {
    await expect(handler(explorerEvent('storefront', {}, { variables: {} }))).rejects.toBeDefined()
  })
})

describe('client selection', () => {
  it.each([
    ['storefront', 'storefront'],
    ['admin', 'admin'],
    ['customer-account', 'customerAccount'],
  ])('routes /%s to the %s client', async (path, client) => {
    await handler(explorerEvent(path))

    expect(createShopifyClient).toHaveBeenCalledWith(
      runtimeConfig._shopify,
      expect.objectContaining({ client }),
    )
  })

  it('supplies the session access token for the customer account client', async () => {
    await handler(explorerEvent('customer-account'))

    const options = createShopifyClient.mock.calls.at(-1)?.[1] as { auth: () => unknown }

    expect(await options.auth()).toBe('Bearer customer-access-token')
  })

  it('forwards the query and variables to the client', async () => {
    await handler(explorerEvent('storefront', {}, { query, variables: { first: 2 } }))

    expect(request).toHaveBeenCalledWith(query, { variables: { first: 2 } })
  })

  it('ignores a query string on the explorer path when picking the client', async () => {
    const event = createTestEvent({
      method: 'POST',
      path: '/_explorer/proxy/admin?operationName=Shop',
      body: { query },
    })

    await handler(event)

    expect(createShopifyClient).toHaveBeenCalledWith(
      runtimeConfig._shopify,
      expect.objectContaining({ client: 'admin' }),
    )
  })
})
