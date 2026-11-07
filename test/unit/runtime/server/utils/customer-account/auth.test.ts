import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CLIENT_ID,
  ORIGIN,
  SHOP_ID,
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
  getRouteRules: () => ({}),
  useNitroApp: () => ({ hooks }),
  useStorage: vi.fn(),
}))

const { getValidCustomerAccessToken } = await import('#src/runtime/server/utils/customer-account/auth')
const { getCustomerAccountSession } = await import('#src/runtime/server/utils/customer-account/session')

const TOKEN_URL = `https://shopify.com/authentication/${SHOP_ID}/oauth/token`

const EXPIRED = { expiresAt: Date.now() - 1000 }

function respondWithTokens(body: Record<string, unknown> = { access_token: 'fresh-access-token', refresh_token: 'fresh-refresh-token', expires_in: 3600 }) {
  fetchMock.mockImplementation(async () => Response.json(body))
}

function tokenRequest() {
  const [url, init] = fetchMock.mock.calls[0]!

  return { url: String(url), headers: new Headers(init?.headers), body: new URLSearchParams(init?.body as URLSearchParams) }
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

  it('refreshes an expired access token at Shopify\'s token endpoint', async () => {
    respondWithTokens()

    await expect(getValidCustomerAccessToken(request(await signIn(EXPIRED)))).resolves.toBe('fresh-access-token')

    const { url, headers, body } = tokenRequest()

    expect(url).toBe(TOKEN_URL)
    expect(headers.get('origin')).toBe(ORIGIN)
    expect(Object.fromEntries(body)).toEqual({ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: 'refresh-token' })
  })

  it('keeps the refreshed tokens for the next request', async () => {
    respondWithTokens()

    const event = request(await signIn(EXPIRED))

    await getValidCustomerAccessToken(event)

    fetchMock.mockClear()

    await expect(getValidCustomerAccessToken(request(toCookieHeader(event)))).resolves.toBe('fresh-access-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls the refresh hook with the request once the token was refreshed', async () => {
    respondWithTokens()

    const event = request(await signIn(EXPIRED))

    await getValidCustomerAccessToken(event)

    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:refresh', { event })
  })

  it('signs the customer out when Shopify rejects the refresh token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }))

    const event = request(await signIn(EXPIRED))

    await expect(getValidCustomerAccessToken(event)).rejects.toMatchObject({ statusCode: 401 })
    await expect(getCustomerAccountSession(request(toCookieHeader(event)))).resolves.toEqual({ isLoggedIn: false })
    expect(hooks.callHook).not.toHaveBeenCalled()
  })

  it.each([
    ['an unavailable token endpoint', () => fetchMock.mockResolvedValue(new Response(null, { status: 503 }))],
    ['a network failure', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
  ])('keeps the session through %s', async (_, fail) => {
    fail()

    const event = request(await signIn(EXPIRED))

    await expect(getValidCustomerAccessToken(event)).rejects.toMatchObject({ statusCode: 401 })
    await expect(getCustomerAccountSession(request(toCookieHeader(event)))).resolves.toEqual({ isLoggedIn: true })
  })
})
