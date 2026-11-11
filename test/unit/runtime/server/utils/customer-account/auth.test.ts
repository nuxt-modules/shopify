import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  EXPIRED,
  UNCONFIGURED_SHOPIFY_CONFIG,
  createHttpsEvent as request,
  createSessionCookie as signIn,
  createShopifyConfig,
} from '#test/helpers/customer-account'
import { toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const hooks = { callHook: vi.fn(() => Promise.resolve()) }

const fetchMock = vi.fn<typeof fetch>()

vi.stubGlobal('fetch', fetchMock)

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules: (event: { context: { _nitro?: { routeRules?: object } } }) => event.context._nitro?.routeRules ?? {},
  useNitroApp: () => ({ hooks }),
  useStorage: vi.fn(),
}))

const { customerAccountContext, getValidCustomerAccessToken } = await import('#src/runtime/server/utils/customer-account/auth')
const { getCustomerAccountSession } = await import('#src/runtime/server/utils/customer-account/session')

function respondWithTokens(body: Record<string, unknown> = { access_token: 'fresh-access-token', refresh_token: 'fresh-refresh-token', expires_in: 3600 }) {
  fetchMock.mockImplementation(async () => Response.json(body))
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()

  runtimeConfig._shopify = createShopifyConfig()
})

describe('getValidCustomerAccessToken', () => {
  it('reports a missing request event instead of failing on a cookie read', async () => {
    await expect(getValidCustomerAccessToken(undefined))
      .rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('Request event is not available') })
  })

  it('throws when the customer account client is not configured', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(getValidCustomerAccessToken(request()))
      .rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('Customer account client is not configured') })
  })

  it('rejects an anonymous request as unauthorized', async () => {
    await expect(getValidCustomerAccessToken(request()))
      .rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('not logged in') })
  })

  it('returns a usable access token without refreshing it', async () => {
    await expect(getValidCustomerAccessToken(request(await signIn()))).resolves.toBe('access-token')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(hooks.callHook).not.toHaveBeenCalled()
  })

  it('refreshes an expired access token, calls the refresh hook with the request and keeps the new token for the next request', async () => {
    respondWithTokens()

    const event = request(await signIn(EXPIRED))

    await expect(getValidCustomerAccessToken(event)).resolves.toBe('fresh-access-token')
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:refresh', { event })

    fetchMock.mockClear()

    await expect(getValidCustomerAccessToken(request(toCookieHeader(event)))).resolves.toBe('fresh-access-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes an expired token once for all queries of a request, and calls the refresh hook once', async () => {
    respondWithTokens()

    const event = request(await signIn(EXPIRED))

    await expect(Promise.all([getValidCustomerAccessToken(event), getValidCustomerAccessToken(event)])).resolves.toEqual(['fresh-access-token', 'fresh-access-token'])

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(hooks.callHook).toHaveBeenCalledOnce()
  })

  it.each([
    ['signs the customer out when Shopify rejects the refresh token', () => fetchMock.mockResolvedValue(new Response(null, { status: 400 })), false],
    ['keeps the session through an unavailable token endpoint', () => fetchMock.mockResolvedValue(new Response(null, { status: 503 })), true],
    ['keeps the session through a network failure', () => fetchMock.mockRejectedValue(new TypeError('fetch failed')), true],
  ])('rejects the request as unauthorized and %s', async (_, fail, staysSignedIn) => {
    fail()

    const event = request(await signIn(EXPIRED))

    await expect(getValidCustomerAccessToken(event)).rejects.toMatchObject({ statusCode: 401 })
    await expect(getCustomerAccountSession(request(toCookieHeader(event)))).resolves.toEqual({ isLoggedIn: staysSignedIn })
    expect(hooks.callHook).not.toHaveBeenCalled()
  })
})

describe('customerAccountContext', () => {
  it('reads the session of the request it renders', async () => {
    await expect(customerAccountContext.getSession(request(await signIn()))).resolves.toEqual({ isLoggedIn: true })
  })

  it('leaves the session of a page cached by its route rule unknown, so the browser reads it after hydration', async () => {
    const event = request(await signIn())

    event.context._nitro = { routeRules: { cache: { swr: true, maxAge: 60 } } }

    await expect(customerAccountContext.getSession(event)).resolves.toBeNull()
  })
})
