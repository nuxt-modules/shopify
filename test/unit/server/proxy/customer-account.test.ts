import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const upstream = vi.fn()
const getValidCustomerAccessToken = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('#src/runtime/server/utils/customer-account/auth', () => ({
  getValidCustomerAccessToken: (...args: unknown[]) => getValidCustomerAccessToken(...args as []),
}))

const handler = (await import('#src/runtime/server/api/proxy/customer-account')).default

const query = '{ customer { id } }'

function proxyEvent(headers: Record<string, string> = {}, body: unknown = { query }) {
  return createTestEvent({ method: 'POST', path: '/_proxy/customer-account', headers, body })
}

const lastCall = () => ({
  url: upstream.mock.calls.at(-1)?.[0] as string,
  options: upstream.mock.calls.at(-1)?.[1] as { headers: Record<string, string>, body: unknown },
})

beforeEach(() => {
  vi.clearAllMocks()

  upstream.mockResolvedValue({ data: { customer: { id: 'gid://shopify/Customer/1' } } })
  getValidCustomerAccessToken.mockResolvedValue('Bearer customer-access-token')

  globalThis.$fetch = upstream as never

  runtimeConfig._shopify = {
    name: 'test-shop',
    clients: {
      customerAccount: {
        apiVersion: API_VERSION,
        clientId: 'client-id',
        apiURL: `https://shopify.com/1/account/customer/api/${API_VERSION}/graphql`,
      },
    },
  }
})

describe('customer account proxy', () => {
  it('rejects a cross-site request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 403 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('does not resolve an access token for a cross-site request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'cross-site' }))).rejects.toBeDefined()

    expect(getValidCustomerAccessToken).not.toHaveBeenCalled()
  })

  it('rejects a body without a query as a validation error', async () => {
    await expect(handler(proxyEvent({}, { variables: {} }))).rejects.toMatchObject({ statusCode: 400 })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('authorizes upstream with the session access token only, never a client supplied one', async () => {
    await handler(proxyEvent({ authorization: 'Bearer forged-token' }))

    expect(lastCall().options.headers).toStrictEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer customer-access-token',
    })
  })

  it('reports the unauthorized error when the session has expired', async () => {
    getValidCustomerAccessToken.mockRejectedValue(
      Object.assign(new Error('expired'), { statusCode: 401 }),
    )

    await expect(handler(proxyEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('targets the configured customer account api url', async () => {
    await handler(proxyEvent())

    expect(lastCall().url).toBe(`https://shopify.com/1/account/customer/api/${API_VERSION}/graphql`)
  })

  it('forwards the query and variables', async () => {
    await handler(proxyEvent({}, { query, variables: { first: 5 } }))

    expect(lastCall().options.body).toEqual({ query, variables: { first: 5 } })
  })

  it('reports a missing customer account client configuration', async () => {
    runtimeConfig._shopify = { name: 'test-shop', clients: {} }

    await expect(handler(proxyEvent())).rejects.toThrow(/client is not configured/)
  })
})

describe('upstream failures', () => {
  const fetchError = (status: number, data: unknown) =>
    Object.assign(new Error(`[POST] "https://shopify.com/…": ${status}`), { status, statusCode: status, data })

  it('names the customer account API in the message', async () => {
    upstream.mockRejectedValue(fetchError(403, { errors: [{ message: 'Forbidden' }] }))

    await expect(handler(proxyEvent())).rejects.toThrow(/customer account API/)
  })
})
