import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { SHOP_ID, UNCONFIGURED_SHOPIFY_CONFIG, createHttpsEvent, createSessionCookie, createShopifyConfig } from '#test/helpers/customer-account'
import { getResponseHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const upstream = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules: () => ({}),
  useNitroApp: () => ({ hooks: { callHook: vi.fn(() => Promise.resolve()) } }),
  useStorage: vi.fn(),
}))

const handler = (await import('#src/runtime/server/api/customer-account/proxy')).default

const query = '{ customer { id } }'

let signedIn: string

function proxyEvent(headers: Record<string, string> = {}, body: unknown = { query }, version = API_VERSION, cookie = signedIn) {
  const event = createHttpsEvent(cookie, { method: 'POST', path: `/account/customer/api/${version}/graphql`, headers, body })

  event.context.params = { version }

  return event
}

const lastCall = () => ({
  url: upstream.mock.calls.at(-1)?.[0] as string,
  options: upstream.mock.calls.at(-1)?.[1] as { method: string, headers: Record<string, string>, body: unknown },
})

beforeEach(async () => {
  vi.clearAllMocks()

  upstream.mockResolvedValue({ data: { customer: { id: 'gid://shopify/Customer/1' } } })

  globalThis.$fetch = upstream as never

  runtimeConfig._shopify = createShopifyConfig()

  signedIn = await createSessionCookie({ accessToken: 'customer-access-token' })
})

describe('customer account proxy', () => {
  it('rejects a cross-site request', async () => {
    await expect(handler(proxyEvent({ 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 403 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects a form encoded mutation from a sibling subdomain', async () => {
    const form = { 'content-type': 'application/x-www-form-urlencoded', 'sec-fetch-site': 'same-site', 'origin': 'https://blog.example.com' }

    await expect(handler(proxyEvent(form, 'query=mutation { customerUpdate(input: {}) { userErrors { message } } }')))
      .rejects.toMatchObject({ statusCode: 403 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects a request that is not sent as JSON', async () => {
    await expect(handler(proxyEvent({ 'content-type': 'application/x-www-form-urlencoded' }, `query=${query}`)))
      .rejects.toMatchObject({ statusCode: 415 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects a body without a query as a validation error', async () => {
    await expect(handler(proxyEvent({}, { variables: {} }))).rejects.toMatchObject({ statusCode: 400 })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('authorizes upstream with the session access token only, never a client supplied one', async () => {
    await handler(proxyEvent({ authorization: 'Bearer forged-token' }))

    expect(lastCall().options.headers).toStrictEqual({
      'Content-Type': 'application/json',
      'Authorization': 'customer-access-token',
    })
  })

  it('rejects a request without a signed-in customer as unauthorized', async () => {
    await expect(handler(proxyEvent({}, { query }, API_VERSION, ''))).rejects.toMatchObject({ statusCode: 401 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('targets the Customer Account API of the configured shop ID', async () => {
    await handler(proxyEvent())

    expect(lastCall().url).toBe(`https://shopify.com/${SHOP_ID}/account/customer/api/${API_VERSION}/graphql`)
  })

  it('posts the query and variables upstream', async () => {
    await handler(proxyEvent({}, { query, variables: { first: 5 } }))

    expect(lastCall().options.method).toBe('POST')
    expect(lastCall().options.body).toEqual({ query, variables: { first: 5 } })
  })

  it('gives up on the Customer Account API after Hydrogen\'s 30 seconds, as its proxies do', async () => {
    await handler(proxyEvent())

    expect(lastCall().options).toMatchObject({ timeout: 30_000 })
  })

  it('posts the operation name upstream, so Shopify can run one operation of a document with several', async () => {
    const document = 'query Customer { customer { id } } query Orders { customer { orders(first: 1) { nodes { id } } } }'

    await handler(proxyEvent({}, { query: document, operationName: 'Orders' }))

    expect(lastCall().options.body).toEqual({ query: document, operationName: 'Orders' })
  })

  it('never lets a response with customer data be cached', async () => {
    const event = proxyEvent()

    await handler(event)

    expect(getResponseHeader(event, 'cache-control')).toBe('private, no-store')
  })

  it('targets the api version of the requested path', async () => {
    await handler(proxyEvent({}, { query }, OTHER_API_VERSION))

    expect(lastCall().url).toBe(`https://shopify.com/${SHOP_ID}/account/customer/api/${OTHER_API_VERSION}/graphql`)
  })

  it.each(['..', 'latest', '$\'', '2026-1'])('rejects the malformed api version %s before calling Shopify', async (version) => {
    await expect(handler(proxyEvent({}, { query }, version))).rejects.toMatchObject({ statusCode: 400 })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('reports a missing customer account client configuration', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(proxyEvent())).rejects.toThrow(/client is not configured/)
  })
})

describe('upstream failures', () => {
  const fetchError = (status: number, data: unknown) =>
    Object.assign(new Error(`[POST] "https://shopify.com/…": ${status}`), { status, statusCode: status, data })

  it('logs Shopify\'s answer and hands the visitor only its status', async () => {
    const log = vi.fn()

    runtimeConfig._shopify = { ...createShopifyConfig(), logger: { reporters: [{ log }] } }

    upstream.mockRejectedValue(fetchError(403, { errors: [{ message: 'Forbidden for client shp_123' }] }))

    const error = await handler(proxyEvent()).catch(error => error)

    expect(error).toMatchObject({ statusCode: 403, statusMessage: 'Forbidden', message: '[shopify] Request to Shopify failed' })
    expect(error.data).toBeUndefined()
    expect(JSON.stringify(error)).not.toContain('shp_123')
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: ['The Customer Account API rejected the request: [POST] "https://shopify.com/…": 403 {"errors":[{"message":"Forbidden for client shp_123"}]}'] }),
      expect.anything(),
    )
  })

  it('answers a bad gateway when Shopify sent no answer', async () => {
    upstream.mockRejectedValue(new Error('[POST] "https://shopify.com/…": <no response> fetch failed'))

    await expect(handler(proxyEvent())).rejects.toMatchObject({ statusCode: 502, statusMessage: 'Bad Gateway', message: '[shopify] Request to Shopify failed' })
  })
})
