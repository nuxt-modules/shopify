import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, UNCONFIGURED_SHOPIFY_CONFIG, createNoopStorage, createShopifyConfig } from '#test/helpers/customer-account'
import { createTestEvent, getResponseCookies, getResponseHeader, getSetCookieHeaders, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const hooks = { callHook: vi.fn(() => Promise.resolve()) }

const exchangeAuthorizationCode = vi.fn()
const fetchCustomerIdentity = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useNitroApp: () => ({ hooks }),
  useStorage: () => createNoopStorage(),
}))

vi.mock('#src/runtime/utils/clients/customer-account/auth', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '#src/runtime/utils/clients/customer-account/auth',
  )

  return {
    ...actual,
    getOpenIdConfiguration: () => Promise.resolve({
      authorization_endpoint: 'https://shopify.example/oauth/authorize',
      token_endpoint: 'https://shopify.example/oauth/token',
      logout_endpoint: 'https://shopify.example/oauth/logout',
    }),
    exchangeAuthorizationCode: (...args: unknown[]) => exchangeAuthorizationCode(...args as []),
    fetchCustomerIdentity: (...args: unknown[]) => fetchCustomerIdentity(...args as []),
  }
})

const handler = (await import('#src/runtime/server/api/auth/customer-account/callback')).default
const { getCustomerAccountSession } = await import('#src/runtime/server/utils/customer-account/session')

const STATE_COOKIE = 'shopify-customer-account-state'
const VERIFIER_COOKIE = 'shopify-customer-account-verifier'
const NONCE_COOKIE = 'shopify-customer-account-nonce'
const RETURN_TO_COOKIE = 'shopify-customer-account-return-to'

function encodeIdToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${payload}.signature`
}

const callbackEvent = (path: string, headers: Record<string, string> = {}) =>
  createTestEvent({ method: 'GET', path: `/_auth/customer-account/callback${path}`, headers })

async function completeFlow(
  secondLegQuery: (cookies: Record<string, string>) => string,
  { firstLegQuery = '', echoNonce = true } = {},
) {
  const first = callbackEvent(firstLegQuery)

  await handler(first)

  const cookies = getResponseCookies(first)

  if (echoNonce) {
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })
  }

  const second = callbackEvent(secondLegQuery(cookies), { cookie: toCookieHeader(first) })

  await handler(second)

  return { first, second, cookies }
}

function configure(customerAccount: Record<string, unknown> = {}) {
  runtimeConfig._shopify = createShopifyConfig({
    apiURL: 'https://shopify.com/1/account/customer/api/2026-01/graphql',
    scope: ['openid', 'email'],
    afterLogin: '/',
    afterLogout: '/',
    routes: {
      callback: '_auth/customer-account/callback',
      logout: '_auth/customer-account/logout',
      session: '_auth/customer-account/session',
    },
    ...customerAccount,
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  configure()

  fetchCustomerIdentity.mockResolvedValue(CUSTOMER)
  exchangeAuthorizationCode.mockResolvedValue({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 7200,
  })
})

describe('first leg', () => {
  it('redirects to the shopify authorization endpoint', async () => {
    const event = callbackEvent('')

    await handler(event)

    expect(getResponseHeader(event, 'location')).toContain('https://shopify.example/oauth/authorize')
  })

  it('sets single use state and nonce cookies', async () => {
    const event = callbackEvent('')

    await handler(event)

    const cookies = getResponseCookies(event)

    expect(cookies[STATE_COOKIE]).toBeTruthy()
    expect(cookies[NONCE_COOKIE]).toBeTruthy()
    expect(cookies[STATE_COOKIE]).not.toBe(cookies[NONCE_COOKIE])
  })

  it('marks the transient cookies http only and lax', async () => {
    const event = callbackEvent('')

    await handler(event)

    for (const cookie of getSetCookieHeaders(event)) {
      expect(cookie).toMatch(/HttpOnly/i)
      expect(cookie).toMatch(/SameSite=Lax/i)
    }
  })

  it('carries the state and nonce it stored into the authorization url', async () => {
    const event = callbackEvent('')

    await handler(event)

    const cookies = getResponseCookies(event)

    expect(getResponseHeader(event, 'location')).toContain(`state=${cookies[STATE_COOKIE]}`)
    expect(getResponseHeader(event, 'location')).toContain(`nonce=${cookies[NONCE_COOKIE]}`)
  })

  it('uses PKCE for a public client', async () => {
    const event = callbackEvent('')

    await handler(event)

    expect(getResponseCookies(event)[VERIFIER_COOKIE]).toBeTruthy()
    expect(getResponseHeader(event, 'location')).toContain('code_challenge_method=S256')
  })

  it('skips PKCE for a confidential client', async () => {
    configure({ clientSecret: 'client-secret' })

    const event = callbackEvent('')

    await handler(event)

    expect(getResponseCookies(event)[VERIFIER_COOKIE]).toBeUndefined()
    expect(getResponseHeader(event, 'location')).not.toContain('code_challenge')
  })

  it('remembers a safe return path', async () => {
    const event = callbackEvent('?return_to=/account/orders')

    await handler(event)

    expect(getResponseCookies(event)[RETURN_TO_COOKIE]).toBe('/account/orders')
  })

  it.each([
    ['//evil.example'],
    ['https://evil.example'],
    ['/\\evil.example'],
    ['evil.example'],
  ])('refuses to remember the unsafe return path %s', async (returnTo) => {
    const event = callbackEvent(`?return_to=${encodeURIComponent(returnTo)}`)

    await handler(event)

    expect(getResponseCookies(event)[RETURN_TO_COOKIE]).toBeUndefined()
  })

  it('fails when the customer account client is not configured', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(callbackEvent(''))).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('state validation', () => {
  it('rejects a code with no state cookie at all', async () => {
    await expect(handler(callbackEvent('?code=abc&state=whatever')))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a state that does not match the cookie', async () => {
    const first = callbackEvent('')

    await handler(first)

    const second = callbackEvent('?code=abc&state=forged', { cookie: toCookieHeader(first) })

    await expect(handler(second)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a missing state parameter even with a valid cookie', async () => {
    const first = callbackEvent('')

    await handler(first)

    const second = callbackEvent('?code=abc', { cookie: toCookieHeader(first) })

    await expect(handler(second)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('does not exchange the code when the state is invalid', async () => {
    await expect(handler(callbackEvent('?code=abc&state=forged'))).rejects.toBeDefined()

    expect(exchangeAuthorizationCode).not.toHaveBeenCalled()
  })

  it('clears the transient cookies once the state has been checked', async () => {
    const first = callbackEvent('')

    await handler(first)

    const second = callbackEvent(
      `?code=abc&state=${getResponseCookies(first)[STATE_COOKIE]}`,
      { cookie: toCookieHeader(first) },
    )

    await handler(second)

    const cleared = getSetCookieHeaders(second).filter(cookie => cookie.startsWith('shopify-customer-account-'))

    expect(cleared.length).toBeGreaterThanOrEqual(3)

    for (const cookie of cleared) {
      expect(cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)
    }
  })

  it('does not accept the state cookie twice', async () => {
    const first = callbackEvent('')

    await handler(first)

    const state = getResponseCookies(first)[STATE_COOKIE]

    const second = callbackEvent(`?code=abc&state=${state}`, { cookie: toCookieHeader(first) })

    await handler(second)

    const replay = callbackEvent(`?code=abc&state=${state}`, { cookie: toCookieHeader(second) })

    await expect(handler(replay)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('PKCE', () => {
  it('rejects a public client callback whose verifier cookie is gone', async () => {
    const first = callbackEvent('')

    await handler(first)

    const cookies = getResponseCookies(first)

    const second = callbackEvent(`?code=abc&state=${cookies[STATE_COOKIE]}`, {
      cookie: `${STATE_COOKIE}=${cookies[STATE_COOKIE]}; ${NONCE_COOKIE}=${cookies[NONCE_COOKIE]}`,
    })

    await expect(handler(second)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('sends the stored verifier to the token endpoint', async () => {
    const { cookies } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    expect(cookies[VERIFIER_COOKIE]).toBeTruthy()

    expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ codeVerifier: cookies[VERIFIER_COOKIE], code: 'abc' }),
    )
  })
})

describe('nonce validation', () => {
  it('redirects with an error marker when the id token nonce does not match', async () => {
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: 'a-different-nonce' }),
    })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toContain('customer_account_error=1')
  })

  it('does not establish a session when the nonce does not match', async () => {
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: 'a-different-nonce' }),
    })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: false })
  })

  it('rejects a token response that carries no id token at all', async () => {
    exchangeAuthorizationCode.mockResolvedValue({ access_token: 'access-token', expires_in: 7200 })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toContain('customer_account_error=1')
  })

  it('accepts a matching nonce', async () => {
    exchangeAuthorizationCode.mockImplementation(() => Promise.resolve({
      access_token: 'access-token',
      expires_in: 7200,
      id_token: undefined,
    }))

    const first = callbackEvent('')

    await handler(first)

    const cookies = getResponseCookies(first)

    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })

    const second = callbackEvent(`?code=abc&state=${cookies[STATE_COOKIE]}`, { cookie: toCookieHeader(first) })

    await handler(second)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: true })
  })
})

describe('success', () => {
  async function succeed(query: (cookies: Record<string, string>) => string) {
    const first = callbackEvent('?return_to=/account/orders')

    await handler(first)

    const cookies = getResponseCookies(first)

    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })

    const second = callbackEvent(query(cookies), { cookie: toCookieHeader(first) })

    await handler(second)

    return second
  }

  it('creates a session for the customer', async () => {
    const second = await succeed(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: true, user: CUSTOMER })
  })

  it('redirects to the remembered return path', async () => {
    const second = await succeed(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    expect(getResponseHeader(second, 'location')).toBe('/account/orders')
  })

  it('calls the success hook with the customer and tokens', async () => {
    await succeed(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    expect(hooks.callHook).toHaveBeenCalledWith(
      'customer-account:auth:success',
      expect.objectContaining({
        user: CUSTOMER,
        tokens: expect.objectContaining({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
      }),
    )
  })

  it('redirects to afterLogin when nothing was remembered', async () => {
    const first = callbackEvent('')

    await handler(first)

    const cookies = getResponseCookies(first)

    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })

    const second = callbackEvent(`?code=abc&state=${cookies[STATE_COOKIE]}`, { cookie: toCookieHeader(first) })

    await handler(second)

    expect(getResponseHeader(second, 'location')).toBe('/')
  })

  it('redirects with an error marker when the token exchange fails', async () => {
    exchangeAuthorizationCode.mockRejectedValue(new Error('invalid_grant'))

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toContain('customer_account_error=1')
  })

  it('calls the error hook when the token exchange fails', async () => {
    exchangeAuthorizationCode.mockRejectedValue(new Error('invalid_grant'))

    await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(hooks.callHook).toHaveBeenCalledWith('customer-account:auth:error', expect.anything())
  })
})

describe('provider errors', () => {
  it('redirects home when the customer declines authorization', async () => {
    const event = callbackEvent('?error=access_denied')

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/')
  })

  it('redirects to the remembered path when the customer declines authorization', async () => {
    const first = callbackEvent('?return_to=/account')

    await handler(first)

    const second = callbackEvent('?error=access_denied', { cookie: toCookieHeader(first) })

    await handler(second)

    expect(getResponseHeader(second, 'location')).toBe('/account')
  })

  it('reports any other provider error as unauthorized', async () => {
    await expect(handler(callbackEvent('?error=server_error&error_description=boom')))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('calls the error hook for a provider error', async () => {
    await expect(handler(callbackEvent('?error=server_error'))).rejects.toBeDefined()

    expect(hooks.callHook).toHaveBeenCalledWith('customer-account:auth:error', expect.anything())
  })
})

describe('dev tunnel bridge', () => {
  const TUNNEL = 'https://tunnel.example.dev'

  const tunnelEvent = (query = '', headers: Record<string, string> = {}) => createTestEvent({
    method: 'GET',
    path: `/_auth/customer-account/callback${query}`,
    headers: { 'host': 'tunnel.example.dev', 'x-forwarded-proto': 'https', ...headers },
  })

  async function completeTunnelFlow() {
    const first = tunnelEvent()

    await handler(first)

    const cookies = getResponseCookies(first)

    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })

    const second = tunnelEvent(`?code=abc&state=${cookies[STATE_COOKIE]}`, { cookie: toCookieHeader(first) })

    await handler(second)

    return getResponseHeader(second, 'location')
  }

  beforeEach(() => {
    vi.stubGlobal('__NUXT_DEV__', true)

    configure({ dev: { tunnelURL: TUNNEL, bridgeURL: '_auth/customer-account/bridge' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    delete process.env.__NUXT_SHOPIFY_DEV_ORIGIN
  })

  it('hands the session back to the dev server the module resolved at listen time', async () => {
    process.env.__NUXT_SHOPIFY_DEV_ORIGIN = 'http://localhost:3311/'

    expect(await completeTunnelFlow()).toMatch(/^http:\/\/localhost:3311\/_auth\/customer-account\/bridge\?nonce=/)
  })

  it('falls back to port 3000 only when the dev server origin is unknown', async () => {
    expect(await completeTunnelFlow()).toMatch(/^http:\/\/localhost:3000\/_auth\/customer-account\/bridge\?nonce=/)
  })

  it('prefers an explicitly configured bridge url over the resolved origin', async () => {
    process.env.__NUXT_SHOPIFY_DEV_ORIGIN = 'http://localhost:3311/'

    configure({ dev: { tunnelURL: TUNNEL, bridgeURL: 'http://localhost:4000/bridge' } })

    expect(await completeTunnelFlow()).toMatch(/^http:\/\/localhost:4000\/bridge\?nonce=/)
  })

  it('accepts every loopback form the dev server can report', async () => {
    configure({ dev: { tunnelURL: TUNNEL, bridgeURL: 'http://127.0.0.1:4000/bridge' } })

    expect(await completeTunnelFlow()).toMatch(/^http:\/\/127\.0\.0\.1:4000\/bridge\?nonce=/)

    configure({ dev: { tunnelURL: TUNNEL, bridgeURL: 'http://[::1]:4000/bridge' } })

    expect(await completeTunnelFlow()).toMatch(/^http:\/\/\[::1\]:4000\/bridge\?nonce=/)
  })

  it('refuses an absolute bridge url pointing away from the dev machine', async () => {
    configure({ dev: { tunnelURL: TUNNEL, bridgeURL: 'https://evil.example/steal' } })

    expect(await completeTunnelFlow()).toContain('customer_account_error=1')
  })
})
