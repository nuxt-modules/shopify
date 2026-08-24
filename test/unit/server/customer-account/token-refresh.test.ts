import type { CustomerAccountTokenSet } from '#src/types/auth'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, UNCONFIGURED_SHOPIFY_CONFIG, createNoopStorage, createShopifyConfig, createTokenSet } from '#test/helpers/customer-account'
import { createTestEvent, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const hooks = { callHook: vi.fn(() => Promise.resolve()) }

const refreshAccessToken = vi.fn()
const getOpenIdConfiguration = vi.fn(() => Promise.resolve({ token_endpoint: 'https://shopify.example/token' }))

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useNitroApp: () => ({ hooks }),
  useStorage: () => createNoopStorage(),
}))

vi.mock('#src/runtime/utils/clients/customer-account/auth', () => ({
  getOpenIdConfiguration: (...args: unknown[]) => getOpenIdConfiguration(...args as []),
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args as []),
}))

const { getValidCustomerAccessToken } = await import('#src/runtime/server/utils/customer-account/auth')

const { getCustomerAccountSession, getCustomerAccountTokens, setCustomerAccountSession }
  = await import('#src/runtime/server/utils/customer-account/session')

async function sessionWith(tokens: CustomerAccountTokenSet) {
  const login = createTestEvent({ method: 'POST' })

  await setCustomerAccountSession(login, { user: CUSTOMER, tokens, loggedInAt: Date.now() })

  return createTestEvent({ method: 'POST', headers: { cookie: toCookieHeader(login) } })
}

beforeEach(() => {
  vi.clearAllMocks()

  runtimeConfig._shopify = createShopifyConfig()
})

describe('getValidCustomerAccessToken', () => {
  it('reports a missing request event instead of failing on a cookie read', async () => {
    await expect(getValidCustomerAccessToken(undefined))
      .rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('Request event is not available') })
  })

  it('throws when the customer account client is not configured', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(getValidCustomerAccessToken(createTestEvent()))
      .rejects.toMatchObject({ statusCode: 500 })
  })

  it('rejects an anonymous request as unauthorized, without claiming a session expired', async () => {
    await expect(getValidCustomerAccessToken(createTestEvent()))
      .rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('not logged in') })
  })

  it('returns a token that is not close to expiring without refreshing', async () => {
    const event = await sessionWith(createTokenSet())

    await expect(getValidCustomerAccessToken(event)).resolves.toBe('access-token')
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('returns a token that has no expiry without refreshing', async () => {
    const event = await sessionWith(createTokenSet({ expiresAt: undefined }))

    await expect(getValidCustomerAccessToken(event)).resolves.toBe('access-token')
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('refreshes a token that expires inside the five minute threshold', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() + 60_000,
      refreshToken: 'threshold-refresh-token',
    }))

    await expect(getValidCustomerAccessToken(event)).resolves.toBe('fresh-access-token')
    expect(refreshAccessToken).toHaveBeenCalledOnce()
  })

  it('refreshes an already expired token', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'expired-refresh-token',
    }))

    await expect(getValidCustomerAccessToken(event)).resolves.toBe('fresh-access-token')
  })

  it('passes the client credentials and refresh token to the token endpoint', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    runtimeConfig._shopify = createShopifyConfig({ clientSecret: 'client-secret' })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'credentials-refresh-token',
    }))

    await getValidCustomerAccessToken(event)

    expect(refreshAccessToken).toHaveBeenCalledWith(
      { token_endpoint: 'https://shopify.example/token' },
      {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'credentials-refresh-token',
      },
    )
  })

  it('persists the refreshed token set back onto the session', async () => {
    refreshAccessToken.mockResolvedValue({
      access_token: 'fresh-access-token',
      refresh_token: 'fresh-refresh-token',
      id_token: 'fresh-id-token',
      expires_in: 7200,
    })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'persist-refresh-token',
    }))

    await getValidCustomerAccessToken(event)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountTokens(next)).resolves.toMatchObject({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      idToken: 'fresh-id-token',
    })
  })

  it('keeps the previous refresh and id token when the response omits them', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'retained-refresh-token',
      idToken: 'retained-id-token',
    }))

    await getValidCustomerAccessToken(event)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountTokens(next)).resolves.toMatchObject({
      refreshToken: 'retained-refresh-token',
      idToken: 'retained-id-token',
    })
  })

  it('calls the refresh hook with the new token set', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'hook-refresh-token',
    }))

    await getValidCustomerAccessToken(event)

    expect(hooks.callHook).toHaveBeenCalledWith(
      'customer-account:auth:refresh',
      { tokens: expect.objectContaining({ accessToken: 'fresh-access-token' }) },
    )
  })

  it('rejects an expired token that has no refresh token', async () => {
    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: undefined,
    }))

    await expect(getValidCustomerAccessToken(event)).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining('no refresh token is stored'),
    })

    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('clears the session and reports 401 when the refresh is rejected', async () => {
    refreshAccessToken.mockRejectedValue(new Error('invalid_grant'))

    const event = await sessionWith(createTokenSet({
      expiresAt: Date.now() - 1000,
      refreshToken: 'rejected-refresh-token',
    }))

    await expect(getValidCustomerAccessToken(event)).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining('refreshing the access token failed'),
    })

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: false })
  })

  it('runs a single refresh for concurrent requests', async () => {
    let resolveRefresh: (value: unknown) => void

    refreshAccessToken.mockImplementation(() => new Promise((resolve) => {
      resolveRefresh = resolve
    }))

    const expiredTokens = createTokenSet({ expiresAt: Date.now() - 1000, refreshToken: 'shared-refresh-token' })

    const [first, second] = await Promise.all([sessionWith(expiredTokens), sessionWith(expiredTokens)])

    const pending = Promise.all([
      getValidCustomerAccessToken(first!),
      getValidCustomerAccessToken(second!),
    ])

    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalled())

    resolveRefresh!({ access_token: 'fresh-access-token', expires_in: 7200 })

    await expect(pending).resolves.toEqual(['fresh-access-token', 'fresh-access-token'])
    expect(refreshAccessToken).toHaveBeenCalledOnce()
  })

  it('allows a later refresh once the first one finished', async () => {
    refreshAccessToken.mockResolvedValue({ access_token: 'fresh-access-token', expires_in: 7200 })

    const expiredTokens = createTokenSet({ expiresAt: Date.now() - 1000, refreshToken: 'sequential-refresh-token' })

    await getValidCustomerAccessToken(await sessionWith(expiredTokens))
    await getValidCustomerAccessToken(await sessionWith(expiredTokens))

    expect(refreshAccessToken).toHaveBeenCalledTimes(2)
  })
})
