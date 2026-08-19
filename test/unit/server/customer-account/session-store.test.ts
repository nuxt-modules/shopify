import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, SESSION_PASSWORD, createShopifyConfig, createTokenSet } from '#test/helpers/customer-account'
import { createTestEvent, getSetCookieHeaders, toCookieHeader } from '#test/helpers/event'

type TokenStorage = {
  setItem: ReturnType<typeof vi.fn>
  getItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
}

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}
const storages = new Map<string, TokenStorage>()

function useTokenStorage(base: string): TokenStorage {
  if (!storages.has(base)) {
    const items = new Map<string, unknown>()

    storages.set(base, {
      setItem: vi.fn((key: string, value: unknown) => void items.set(key, value)),
      getItem: vi.fn((key: string) => items.get(key) ?? null),
      removeItem: vi.fn((key: string) => void items.delete(key)),
    })
  }

  return storages.get(base)!
}

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useStorage: (base: string) => useTokenStorage(base),
}))

const {
  clearCustomerAccountSession,
  getCustomerAccountSession,
  getCustomerAccountTokens,
  getSessionConfig,
  requireCustomerAccountSession,
  setCustomerAccountSession,
  setCustomerAccountTokens,
  usesExternalTokenStorage,
} = await import('#src/runtime/server/utils/customer-account/session')

const TOKENS = createTokenSet()

function configure(customerAccount: Record<string, unknown> = {}) {
  runtimeConfig._shopify = createShopifyConfig(customerAccount)
}

/** Logs a customer in on one event, then replays the session cookie onto a fresh one. */
async function loggedInEvent(setup?: Parameters<typeof createTestEvent>[0]) {
  const login = createTestEvent({ method: 'POST' })

  await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1_700_000_000_000 })

  return createTestEvent({
    ...setup,
    headers: { ...setup?.headers, cookie: toCookieHeader(login) },
  })
}

beforeEach(() => {
  storages.clear()
  configure()
})

describe('getSessionConfig', () => {
  it('throws when no session password is configured', () => {
    configure({ session: undefined })

    delete process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD

    expect(() => getSessionConfig(runtimeConfig._shopify as never))
      .toThrowError(expect.objectContaining({ statusCode: 500 }))
  })

  it('falls back to the session password environment variable', () => {
    configure({ session: undefined })

    vi.stubEnv('NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD', SESSION_PASSWORD)

    expect(getSessionConfig(runtimeConfig._shopify as never).password).toBe(SESSION_PASSWORD)

    vi.unstubAllEnvs()
  })

  it('defaults to a lax, http-only cookie', () => {
    expect(getSessionConfig(runtimeConfig._shopify as never).cookie).toMatchObject({
      sameSite: 'lax',
      httpOnly: true,
    })
  })

  it('keeps the cookie http-only even when the config turns it off', () => {
    configure({ session: { password: SESSION_PASSWORD, cookie: { httpOnly: false, sameSite: 'strict' } } })

    expect(getSessionConfig(runtimeConfig._shopify as never).cookie).toMatchObject({
      sameSite: 'strict',
      httpOnly: true,
    })
  })

  it('uses the configured session name and max age', () => {
    configure({ session: { password: SESSION_PASSWORD, name: 'custom-session', maxAge: 900 } })

    const config = getSessionConfig(runtimeConfig._shopify as never)

    expect(config.name).toBe('custom-session')
    expect(config.maxAge).toBe(900)
  })
})

describe('usesExternalTokenStorage', () => {
  it('is false when no token storage is configured', () => {
    expect(usesExternalTokenStorage(runtimeConfig._shopify as never)).toBe(false)
  })

  it('is true once a token storage mount is configured', () => {
    configure({ tokenStorage: 'my-mount' })

    expect(usesExternalTokenStorage(runtimeConfig._shopify as never)).toBe(true)
  })
})

describe('session lifecycle', () => {
  it('reports a logged out session when no cookie is present', async () => {
    await expect(getCustomerAccountSession(createTestEvent())).resolves.toEqual({
      loggedIn: false,
      user: null,
      loggedInAt: null,
    })
  })

  it('does not read a session for a request without the session cookie', async () => {
    const event = createTestEvent({ headers: { cookie: 'unrelated=1' } })

    await expect(getCustomerAccountSession(event)).resolves.toMatchObject({ loggedIn: false })
  })

  it('persists the customer and reads it back on a later request', async () => {
    const event = await loggedInEvent()

    await expect(getCustomerAccountSession(event)).resolves.toEqual({
      loggedIn: true,
      user: CUSTOMER,
      loggedInAt: 1_700_000_000_000,
    })
  })

  it('writes the session as an http-only cookie', async () => {
    const login = createTestEvent({ method: 'POST' })

    await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1 })

    const cookie = getSetCookieHeaders(login).find(entry => entry.startsWith('shopify-customer-account='))

    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
  })

  it('does not put the access token in the cookie as plain text', async () => {
    const login = createTestEvent({ method: 'POST' })

    await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1 })

    expect(getSetCookieHeaders(login).join(';')).not.toContain(TOKENS.accessToken)
  })

  it('requireCustomerAccountSession rejects an anonymous request', async () => {
    await expect(requireCustomerAccountSession(createTestEvent()))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('requireCustomerAccountSession returns the session for a logged in request', async () => {
    const event = await loggedInEvent()

    await expect(requireCustomerAccountSession(event)).resolves.toMatchObject({ loggedIn: true, user: CUSTOMER })
  })

  it('clears the session so a later read is logged out', async () => {
    const event = await loggedInEvent({ method: 'POST' })

    await clearCustomerAccountSession(event)

    const cleared = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountSession(cleared)).resolves.toMatchObject({ loggedIn: false, user: null })
  })
})

describe('token storage', () => {
  it('keeps the tokens inside the sealed session by default', async () => {
    const event = await loggedInEvent()

    await expect(getCustomerAccountTokens(event)).resolves.toEqual(TOKENS)
    expect(storages.size).toBe(0)
  })

  it('returns no tokens for an anonymous request', async () => {
    await expect(getCustomerAccountTokens(createTestEvent())).resolves.toBeNull()
  })

  it('moves the tokens out of the cookie when a token storage is configured', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const login = createTestEvent({ method: 'POST' })

    await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1 })

    expect(useTokenStorage('customer-account-token').setItem).toHaveBeenCalledWith(
      expect.any(String),
      TOKENS,
      undefined,
    )

    const event = createTestEvent({ headers: { cookie: toCookieHeader(login) } })

    await expect(getCustomerAccountTokens(event)).resolves.toEqual(TOKENS)
  })

  it('applies the session max age as the token storage ttl', async () => {
    configure({ tokenStorage: 'customer-account-token', session: { password: SESSION_PASSWORD, maxAge: 900 } })

    await setCustomerAccountSession(createTestEvent({ method: 'POST' }), { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1 })

    expect(useTokenStorage('customer-account-token').setItem).toHaveBeenCalledWith(
      expect.any(String),
      TOKENS,
      { ttl: 900 },
    )
  })

  it('uses a custom token storage mount when one is named', async () => {
    configure({ tokenStorage: 'redis-tokens' })

    await setCustomerAccountSession(createTestEvent({ method: 'POST' }), { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1 })

    expect(storages.has('redis-tokens')).toBe(true)
  })

  it('removes the stored tokens when the session is cleared', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = await loggedInEvent({ method: 'POST' })

    await clearCustomerAccountSession(event)

    expect(useTokenStorage('customer-account-token').removeItem).toHaveBeenCalledWith(expect.any(String))
    await expect(getCustomerAccountTokens(event)).resolves.toBeNull()
  })

  it('does not store tokens for a request without a session', async () => {
    await expect(setCustomerAccountTokens(createTestEvent({ method: 'POST' }), TOKENS))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('replaces the tokens of an existing session', async () => {
    const event = await loggedInEvent({ method: 'POST' })

    const rotated = { ...TOKENS, accessToken: 'rotated-access-token' }

    await setCustomerAccountTokens(event, rotated)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountTokens(next)).resolves.toEqual(rotated)
  })
})
