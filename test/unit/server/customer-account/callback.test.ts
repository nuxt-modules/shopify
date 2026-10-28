import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
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
const { getCustomerAccountSession, getCustomerAccountTokens } = await import('#src/runtime/server/utils/customer-account/session')

const STATE_COOKIE = 'shopify-customer-account-state'
const VERIFIER_COOKIE = 'shopify-customer-account-verifier'
const NONCE_COOKIE = 'shopify-customer-account-nonce'
const RETURN_TO_COOKIE = 'shopify-customer-account-return-to'

const AFTER_LOGIN = '/welcome'
const ERROR_REDIRECT = `${AFTER_LOGIN}?customer_account_error=1`

const UNSAFE_REMEMBERED_PATHS = ['//evil.example', '/\\evil.example']

const NOW = Date.UTC(2026, 0, 1)

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
  { firstLegQuery = '', echoNonce = true, tokenResponse = {}, extraCookie = '' }: {
    firstLegQuery?: string
    echoNonce?: boolean
    tokenResponse?: Record<string, unknown>
    extraCookie?: string
  } = {},
) {
  const first = callbackEvent(firstLegQuery)

  await handler(first)

  const cookies = getResponseCookies(first)

  if (echoNonce) {
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 7200,
      ...tokenResponse,
      id_token: encodeIdToken({ nonce: cookies[NONCE_COOKIE] }),
    })
  }

  const cookie = [toCookieHeader(first), extraCookie].filter(Boolean).join('; ')

  const second = callbackEvent(secondLegQuery(cookies), { cookie })

  await handler(second)

  return { first, second, cookies }
}

function configure(customerAccount: Record<string, unknown> = {}) {
  runtimeConfig._shopify = createShopifyConfig({
    apiURL: `https://shopify.com/1/account/customer/api/${API_VERSION}/graphql`,
    scope: ['openid', 'email'],
    afterLogin: AFTER_LOGIN,
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

  it('sets distinct state and nonce cookies', async () => {
    const event = callbackEvent('')

    await handler(event)

    const cookies = getResponseCookies(event)

    expect(cookies[STATE_COOKIE]).toBeTruthy()
    expect(cookies[NONCE_COOKIE]).toBeTruthy()
    expect(cookies[STATE_COOKIE]).not.toBe(cookies[NONCE_COOKIE])
  })

  it('marks every transient cookie http only, secure and lax', async () => {
    const event = callbackEvent('?return_to=/account/orders')

    await handler(event)

    const cookies = getSetCookieHeaders(event)

    expect(cookies).toHaveLength(4)

    for (const cookie of cookies) {
      expect(cookie).toMatch(/;\s*HttpOnly/i)
      expect(cookie).toMatch(/;\s*Secure/i)
      expect(cookie).toMatch(/;\s*SameSite=Lax/i)
    }
  })

  it('carries the state and nonce it stored into the authorization url', async () => {
    const event = callbackEvent('')

    await handler(event)

    const cookies = getResponseCookies(event)

    expect(getResponseHeader(event, 'location')).toContain(`state=${cookies[STATE_COOKIE]}`)
    expect(getResponseHeader(event, 'location')).toContain(`nonce=${cookies[NONCE_COOKIE]}`)
  })

  it('sends the S256 challenge of the stored PKCE verifier for a public client', async () => {
    const event = callbackEvent('')

    await handler(event)

    const verifier = getResponseCookies(event)[VERIFIER_COOKIE]!
    const params = new URL(getResponseHeader(event, 'location')).searchParams

    expect(verifier).toBeTruthy()
    expect(params.get('code_challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(params.get('code_challenge_method')).toBe('S256')
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

  it('refuses to remember an unsafe return path', async () => {
    const event = callbackEvent(`?return_to=${encodeURIComponent('//evil.example')}`)

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
    const { second } = await completeFlow(
      c => `?code=abc&state=${c[STATE_COOKIE]}`,
      { firstLegQuery: '?return_to=/account/orders' },
    )

    const expired = getSetCookieHeaders(second)
      .filter(cookie => /Max-Age=0/i.test(cookie))
      .map(cookie => cookie.slice(0, cookie.indexOf('=')))

    expect(expired).toEqual(expect.arrayContaining([STATE_COOKIE, NONCE_COOKIE, VERIFIER_COOKIE, RETURN_TO_COOKIE]))
  })

  it('does not accept the state cookie twice', async () => {
    const { second, cookies } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    const replay = callbackEvent(`?code=abc&state=${cookies[STATE_COOKIE]}`, { cookie: toCookieHeader(second) })

    await expect(handler(replay)).rejects.toMatchObject({ statusCode: 403 })
    expect(exchangeAuthorizationCode).toHaveBeenCalledOnce()
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
  it('redirects with an error marker and no session when the id token nonce does not match', async () => {
    exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 7200,
      id_token: encodeIdToken({ nonce: 'a-different-nonce' }),
    })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toBe(ERROR_REDIRECT)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: false })
  })

  it('rejects a token response that carries no id token at all', async () => {
    exchangeAuthorizationCode.mockResolvedValue({ access_token: 'access-token', expires_in: 7200 })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toBe(ERROR_REDIRECT)
  })
})

describe('success', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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
    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`)

    expect(getResponseHeader(second, 'location')).toBe(AFTER_LOGIN)
  })

  it.each(UNSAFE_REMEMBERED_PATHS)('ignores the unsafe remembered path %s after a successful login', async (returnTo) => {
    const { second } = await completeFlow(
      c => `?code=abc&state=${c[STATE_COOKIE]}`,
      { extraCookie: `${RETURN_TO_COOKIE}=${encodeURIComponent(returnTo)}` },
    )

    expect(getResponseHeader(second, 'location')).toBe(AFTER_LOGIN)
  })

  it('stores the token lifetime the token endpoint reports', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { tokenResponse: { expires_in: 3600 } })

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountTokens(next)).resolves.toMatchObject({ expiresAt: NOW + 3600_000 })
  })

  it('falls back to a two hour token lifetime when the token endpoint reports none', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { tokenResponse: { expires_in: undefined } })

    const next = createTestEvent({ headers: { cookie: toCookieHeader(second) } })

    await expect(getCustomerAccountTokens(next)).resolves.toMatchObject({ expiresAt: NOW + 7200_000 })
  })

  it('redirects to afterLogin with an error marker when the token exchange fails', async () => {
    exchangeAuthorizationCode.mockRejectedValue(new Error('invalid_grant'))

    const { second } = await completeFlow(c => `?code=abc&state=${c[STATE_COOKIE]}`, { echoNonce: false })

    expect(getResponseHeader(second, 'location')).toBe(ERROR_REDIRECT)
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

  it.each(UNSAFE_REMEMBERED_PATHS)('ignores the unsafe remembered path %s on a declined authorization', async (returnTo) => {
    const event = callbackEvent('?error=access_denied', {
      cookie: `${RETURN_TO_COOKIE}=${encodeURIComponent(returnTo)}`,
    })

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/')
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

    expect(await completeTunnelFlow()).toBe(ERROR_REDIRECT)
  })
})
