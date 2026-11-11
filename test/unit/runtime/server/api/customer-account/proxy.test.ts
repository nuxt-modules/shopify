import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { SHOP_ID, UNCONFIGURED_SHOPIFY_CONFIG, createHttpsEvent, createSessionCookie, createShopifyConfig } from '#test/helpers/customer-account'
import { getResponseHeader } from '#test/helpers/event'
import { createLogReporter } from '#test/helpers/logger'

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
  it.each([
    ['a cross-site request', () => proxyEvent({ 'sec-fetch-site': 'cross-site' }), 403],
    ['a form encoded mutation from a sibling subdomain', () => proxyEvent({ 'content-type': 'application/x-www-form-urlencoded', 'sec-fetch-site': 'same-site', 'origin': 'https://blog.example.com' }, 'query=mutation { customerUpdate(input: {}) { userErrors { message } } }'), 403],
    ['a request that is not sent as JSON', () => proxyEvent({ 'content-type': 'application/x-www-form-urlencoded' }, `query=${query}`), 415],
    ['a request without a signed-in customer as unauthorized', () => proxyEvent({}, { query }, API_VERSION, ''), 401],
    ['the malformed api version ..', () => proxyEvent({}, { query }, '..'), 400],
    ['the malformed api version latest', () => proxyEvent({}, { query }, 'latest'), 400],
    ['the malformed api version $\'', () => proxyEvent({}, { query }, '$\''), 400],
    ['the malformed api version 2026-1', () => proxyEvent({}, { query }, '2026-1'), 400],
  ])('rejects %s before calling Shopify', async (_, event, statusCode) => {
    await expect(handler(event())).rejects.toMatchObject({ statusCode })

    expect(upstream).not.toHaveBeenCalled()
  })

  it('authorizes upstream with the session access token only, never a client supplied one', async () => {
    await handler(proxyEvent({ authorization: 'Bearer forged-token' }))

    expect(lastCall().options.headers).toStrictEqual({
      'Content-Type': 'application/json',
      'Authorization': 'customer-access-token',
    })
  })

  it('posts the query, its variables and the operation name upstream, so Shopify can run one operation of a document with several', async () => {
    const document = 'query Customer { customer { id } } query Orders { customer { orders(first: 1) { nodes { id } } } }'

    await handler(proxyEvent({}, { query: document, variables: { first: 5 }, operationName: 'Orders' }))

    expect(lastCall().options.method).toBe('POST')
    expect(lastCall().options.body).toEqual({ query: document, variables: { first: 5 }, operationName: 'Orders' })
  })

  it('gives up on the Customer Account API after Hydrogen\'s 30 seconds, as its proxies do', async () => {
    await handler(proxyEvent())

    expect(lastCall().options).toMatchObject({ timeout: 30_000 })
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

  it('reports a missing customer account client configuration', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(proxyEvent())).rejects.toThrow(/client is not configured/)
  })
})

describe('upstream failures', () => {
  const fetchError = (status: number, data: unknown) =>
    Object.assign(new Error(`[POST] "https://shopify.com/…": ${status}`), { status, statusCode: status, data })

  it('logs Shopify\'s answer and hands the visitor only its status', async () => {
    const { log, logger } = createLogReporter()

    runtimeConfig._shopify = { ...createShopifyConfig(), logger }

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
