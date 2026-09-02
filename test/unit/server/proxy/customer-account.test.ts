import { beforeEach, describe, expect, it, vi } from 'vitest'

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
        apiVersion: '2026-01',
        clientId: 'client-id',
        apiURL: 'https://shopify.com/1/account/customer/api/2026-01/graphql',
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

  it('allows a same-origin request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'same-origin' }))).resolves.toBeDefined()
  })

  it('rejects a body without a query', async () => {
    await expect(handler(proxyEvent({}, { variables: {} }))).rejects.toBeDefined()
    expect(upstream).not.toHaveBeenCalled()
  })

  it('attaches the session access token as the authorization header', async () => {
    await handler(proxyEvent())

    expect(lastCall().options.headers).toMatchObject({
      'Authorization': 'Bearer customer-access-token',
      'Content-Type': 'application/json',
    })
  })

  it('never forwards a client supplied authorization header', async () => {
    await handler(proxyEvent({ authorization: 'Bearer forged-token' }))

    expect(lastCall().options.headers.Authorization).toBe('Bearer customer-access-token')
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

    expect(lastCall().url).toBe('https://shopify.com/1/account/customer/api/2026-01/graphql')
  })

  it('forwards the query and variables', async () => {
    await handler(proxyEvent({}, { query, variables: { first: 5 } }))

    expect(lastCall().options.body).toEqual({ query, variables: { first: 5 } })
  })

  it('fails when the customer account client is not configured', async () => {
    runtimeConfig._shopify = { name: 'test-shop', clients: {} }

    await expect(handler(proxyEvent())).rejects.toBeDefined()
  })
})

describe('upstream failures', () => {
  const fetchError = (status: number, data: unknown) =>
    Object.assign(new Error(`[POST] "https://shopify.com/…": ${status}`), { status, statusCode: status, data })

  it('keeps the upstream status instead of collapsing to 500', async () => {
    upstream.mockRejectedValue(fetchError(401, { errors: [{ message: 'Unauthorized' }] }))

    await expect(handler(proxyEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('passes the upstream body through as data', async () => {
    upstream.mockRejectedValue(fetchError(429, { errors: [{ message: 'Throttled' }] }))

    await expect(handler(proxyEvent())).rejects.toMatchObject({
      statusCode: 429,
      data: { errors: [{ message: 'Throttled' }] },
    })
  })

  it('reports a connection failure as a bad gateway', async () => {
    upstream.mockRejectedValue(new Error('connect ECONNREFUSED'))

    await expect(handler(proxyEvent())).rejects.toMatchObject({ statusCode: 502 })
  })

  it('never marks the error unhandled, so production keeps the detail', async () => {
    upstream.mockRejectedValue(fetchError(401, { errors: [{ message: 'nope' }] }))

    await expect(handler(proxyEvent())).rejects.toMatchObject({ unhandled: false, fatal: false })
  })

  it('names the customer account API in the message', async () => {
    upstream.mockRejectedValue(fetchError(403, { errors: [{ message: 'Forbidden' }] }))

    await expect(handler(proxyEvent())).rejects.toThrow(/customer account API/)
  })
})
