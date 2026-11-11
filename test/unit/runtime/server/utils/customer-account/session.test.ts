import type { HydrogenTokens } from '#test/helpers/customer-account'

import { getSession } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  EXPIRED,
  ORIGIN,
  SESSION_PASSWORD,
  createHydrogenSession,
  createHttpsEvent as request,
  createSessionCookie as signIn,
  createShopifyConfig,
  createTokenStorages,
} from '#test/helpers/customer-account'
import { getSetCookieHeaders, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}
const { storages, useTokenStorage } = createTokenStorages()

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useStorage: (base: string) => useTokenStorage(base),
  getRouteRules: (event: { context: { _nitro?: { routeRules?: object } } }) => event.context._nitro?.routeRules ?? {},
}))

const { warnUnmountedStorage } = vi.hoisted(() => ({ warnUnmountedStorage: vi.fn() }))

vi.mock('#src/runtime/utils/storage', () => ({ warnUnmountedStorage }))

const {
  clearCustomerAccountSession,
  createCustomerSessionManager,
  getCustomerAccountSession,
  getSessionConfig,
  requireCustomerAccountSession,
} = await import('#src/runtime/server/utils/customer-account/session')

const HYDROGEN_SESSION_KEY = 'customerAccount'

const PENDING_LOGIN = { state: 'state', nonce: 'nonce', codeVerifier: 'verifier', returnTo: '/account', origin: ORIGIN }

function configure(customerAccount: Record<string, unknown> = {}) {
  runtimeConfig._shopify = createShopifyConfig(customerAccount)
}

async function readSessionData(cookie: string) {
  const { data } = await getSession(request(cookie), getSessionConfig(runtimeConfig._shopify as never))

  return data
}

beforeEach(() => {
  storages.clear()
  fetchMock.mockReset()
  configure()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('getSessionConfig', () => {
  it.each([
    ['missing', undefined, 'no session password configured'],
    ['too short', { password: 'short-password' }, 'at least 32 characters'],
    ['the example value', { password: 'A_RANDOM_32_CHARACTER_OR_LONGER_SECRET' }, 'at least 32 characters'],
  ])('rejects a session password that is %s with a clear error', (_, session, message) => {
    configure({ session })

    vi.stubEnv('NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD', undefined)

    expect(() => getSessionConfig(runtimeConfig._shopify as never))
      .toThrow(expect.objectContaining({ statusCode: 500, message: expect.stringContaining(message) }))
  })

  it('falls back to the session password environment variable', () => {
    configure({ session: undefined })

    vi.stubEnv('NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD', SESSION_PASSWORD)

    expect(getSessionConfig(runtimeConfig._shopify as never).password).toBe(SESSION_PASSWORD)
  })

  it('keeps the cookie http-only even when the config turns it off', () => {
    configure({ session: { password: SESSION_PASSWORD, cookie: { httpOnly: false, sameSite: 'none' } } })

    expect(getSessionConfig(runtimeConfig._shopify as never).cookie).toMatchObject({
      sameSite: 'none',
      httpOnly: true,
    })
  })

  it('only reads the session from its cookie, never from a request header', () => {
    expect(getSessionConfig(runtimeConfig._shopify as never).sessionHeader).toBe(false)
  })

  it('uses the default session name for the empty placeholder declared for environment variables', () => {
    configure({ session: { password: SESSION_PASSWORD, name: '' } })

    expect(getSessionConfig(runtimeConfig._shopify as never).name).toBe('__Host-session')
  })

  it('uses the configured session name and max age', () => {
    configure({ session: { password: SESSION_PASSWORD, name: 'custom-session', maxAge: 900 } })

    const config = getSessionConfig(runtimeConfig._shopify as never)

    expect(config.name).toBe('custom-session')
    expect(config.maxAge).toBe(900)
  })
})

describe('createCustomerSessionManager', () => {
  it('starts the lifetime of a signed out session over when Hydrogen writes to it', async () => {
    configure({ session: { password: SESSION_PASSWORD, maxAge: 3600 } })

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const abandoned = request()

    await createCustomerSessionManager(abandoned).setSessionItem(HYDROGEN_SESSION_KEY, { pendingLogin: PENDING_LOGIN })

    vi.setSystemTime(new Date('2026-01-01T00:50:00Z'))

    const signedIn = request(toCookieHeader(abandoned))

    await createCustomerSessionManager(signedIn).setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession())

    vi.setSystemTime(new Date('2026-01-01T01:10:00Z'))

    await expect(getCustomerAccountSession(request(toCookieHeader(signedIn)))).resolves.toEqual({ isLoggedIn: true })
  })

  it('keeps the lifetime of a signed in session when its tokens are refreshed', async () => {
    configure({ session: { password: SESSION_PASSWORD, maxAge: 3600 } })

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const refreshed = request(await signIn())

    vi.setSystemTime(new Date('2026-01-01T00:50:00Z'))

    await createCustomerSessionManager(refreshed).setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession({ accessToken: 'refreshed-access-token' }))

    vi.setSystemTime(new Date('2026-01-01T01:10:00Z'))

    await expect(getCustomerAccountSession(request(toCookieHeader(refreshed)))).resolves.toEqual({ isLoggedIn: false })
  })

  it('uses the public origin of the request as the session origin', () => {
    runtimeConfig._shopify = { ...createShopifyConfig(), origin: 'https://store.example' }

    expect(createCustomerSessionManager(request()).getSessionOrigin()).toBe('https://store.example')
  })

  it('neither reads nor starts a session for a request without the session cookie', async () => {
    const event = request('unrelated=1')
    const sessionManager = createCustomerSessionManager(event)

    await expect(sessionManager.getSessionItem(HYDROGEN_SESSION_KEY)).resolves.toBeUndefined()
    await sessionManager.removeSessionItem(HYDROGEN_SESSION_KEY)

    expect(getSetCookieHeaders(event)).toEqual([])
  })

  it('writes an http-only, lax cookie that does not reveal the tokens', async () => {
    const event = request()

    await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession())

    const [cookie] = getSetCookieHeaders(event).filter(entry => entry.startsWith('__Host-session='))

    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).not.toContain('access-token')
    expect(cookie).not.toContain('refresh-token')
  })

  it('writes and clears the cookie with the attributes the `__Host-` prefix requires', async () => {
    const event = request()

    await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession())

    const cleared = request(toCookieHeader(event), { method: 'POST' })

    await clearCustomerAccountSession(cleared)

    for (const cookie of [...getSetCookieHeaders(event), ...getSetCookieHeaders(cleared)]) {
      expect(cookie).toMatch(/^__Host-session=/)
      expect(cookie).toMatch(/; Secure/i)
      expect(cookie).toMatch(/; Path=\/(;|$)/i)
      expect(cookie).not.toMatch(/; Domain=/i)
    }

    expect(getSetCookieHeaders(cleared)).toHaveLength(1)
  })
})

describe('token storage', () => {
  it('keeps the tokens inside the sealed session by default', async () => {
    await expect(readSessionData(await signIn())).resolves.toHaveProperty(HYDROGEN_SESSION_KEY)

    expect(storages.size).toBe(0)
  })

  it('moves Hydrogen\'s session out of the cookie when a token storage is configured', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const cookie = await signIn()

    const data = await readSessionData(cookie)

    expect(data).not.toHaveProperty(HYDROGEN_SESSION_KEY)
    expect(data).toEqual({ tokenKey: expect.any(String) })
    expect(useTokenStorage('customer-account-token').items.size).toBe(1)

    await expect(createCustomerSessionManager(request(cookie)).getSessionItem(HYDROGEN_SESSION_KEY))
      .resolves.toMatchObject({ tokens: { accessToken: 'access-token' } })
  })

  async function rotate(cookie: string, tokens: HydrogenTokens) {
    const event = request(cookie)

    await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession(tokens))

    return toCookieHeader(event)
  }

  it('stores new tokens under a new key, keeps the previous one until the new cookie comes back, then locks the older cookie out', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const storage = useTokenStorage('customer-account-token')

    const previousCookie = await signIn()
    const [previousKey] = storage.items.keys()

    const rotatedCookie = await rotate(previousCookie, { accessToken: 'rotated-access-token' })

    expect(storage.items.size).toBe(2)
    await expect(getCustomerAccountSession(request(previousCookie))).resolves.toMatchObject({ isLoggedIn: true })

    await expect(createCustomerSessionManager(request(rotatedCookie)).getSessionItem(HYDROGEN_SESSION_KEY))
      .resolves.toMatchObject({ tokens: { accessToken: 'rotated-access-token' } })

    expect(storage.items.size).toBe(1)
    expect(storage.items.has(previousKey!)).toBe(false)
    await expect(getCustomerAccountSession(request(previousCookie))).resolves.toEqual({ isLoggedIn: false })
  })

  it('keeps the previous key through reads in the request that replaced it', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = request(await signIn())
    const sessionManager = createCustomerSessionManager(event)

    await sessionManager.setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession({ accessToken: 'rotated-access-token' }))
    await sessionManager.getSessionItem(HYDROGEN_SESSION_KEY)
    await createCustomerSessionManager(event).getSessionItem(HYDROGEN_SESSION_KEY)

    expect(useTokenStorage('customer-account-token').items.size).toBe(2)
  })

  it('stores concurrent writes of the same tokens under one key', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const cookie = await signIn()
    const refreshed = createHydrogenSession({ accessToken: 'refreshed-access-token' })

    const writes = [request(cookie), request(cookie)].map(async (event) => {
      await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, refreshed)

      return (await readSessionData(toCookieHeader(event))).tokenKey
    })

    const [first, second] = await Promise.all(writes)

    expect(first).toBe(second)
    expect(useTokenStorage('customer-account-token').items.size).toBe(2)
  })

  it('removes every key a chain of rotations replaced once the newest cookie comes back', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const storage = useTokenStorage('customer-account-token')

    const event = request(await signIn())
    const sessionManager = createCustomerSessionManager(event)

    await sessionManager.setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession({ accessToken: 'second-access-token' }))
    await sessionManager.setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession({ accessToken: 'third-access-token' }))

    expect(storage.items.size).toBe(3)

    await getCustomerAccountSession(request(toCookieHeader(event)))

    expect(storage.items.size).toBe(1)
  })

  it('keeps a pending login in the cookie, so an anonymous login writes nothing to the storage', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = request()

    await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, { pendingLogin: PENDING_LOGIN })

    expect(storages.has('customer-account-token') && useTokenStorage('customer-account-token').items.size).toBeFalsy()
    await expect(createCustomerSessionManager(request(toCookieHeader(event))).getSessionItem(HYDROGEN_SESSION_KEY))
      .resolves.toEqual({ pendingLogin: PENDING_LOGIN })
  })

  it('keeps a pending login next to the stored tokens of a signed in customer', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = request(await signIn())
    const sessionManager = createCustomerSessionManager(event)

    await sessionManager.setSessionItem(HYDROGEN_SESSION_KEY, { ...await sessionManager.getSessionItem(HYDROGEN_SESSION_KEY) as object, pendingLogin: PENDING_LOGIN })

    expect(useTokenStorage('customer-account-token').items.size).toBe(1)
    await expect(createCustomerSessionManager(request(toCookieHeader(event))).getSessionItem(HYDROGEN_SESSION_KEY))
      .resolves.toMatchObject({ pendingLogin: PENDING_LOGIN, tokens: { accessToken: 'access-token' } })
  })

  it('applies the session max age as the token storage ttl', async () => {
    configure({ tokenStorage: 'customer-account-token', session: { password: SESSION_PASSWORD, maxAge: 900 } })

    await signIn()

    expect(useTokenStorage('customer-account-token').setItem).toHaveBeenCalledWith(expect.any(String), expect.any(Object), { ttl: 900 })
  })

  it.each([
    ['customer-account-token', 'a storage driver config', { driver: 'memory' }],
    ['customer-account-token', 'token storage switched on only at runtime', true],
    ['redis-tokens', 'a token storage that names it', 'redis-tokens'],
  ])('stores the tokens in the %s mount for %s, and checks that something is mounted there', async (base, _, tokenStorage) => {
    configure({ tokenStorage })

    await signIn()

    expect([...storages.keys()]).toStrictEqual([base])
    expect(storages.get(base)!.items.size).toBe(1)
    expect(warnUnmountedStorage).toHaveBeenCalledWith(storages.get(base), base, undefined)
  })

  it('deletes the stored session when Hydrogen removes it', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = request(await signIn())

    await createCustomerSessionManager(event).removeSessionItem(HYDROGEN_SESSION_KEY)

    expect(useTokenStorage('customer-account-token').items.size).toBe(0)
    await expect(readSessionData(toCookieHeader(event))).resolves.not.toHaveProperty('tokenKey')
  })

  it('deletes the stored tokens when Hydrogen writes the session without them', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const event = request(await signIn())

    await createCustomerSessionManager(event).setSessionItem(HYDROGEN_SESSION_KEY, { pendingLogin: PENDING_LOGIN })

    expect(useTokenStorage('customer-account-token').items.size).toBe(0)
  })

  it('deletes the tokens a refresh replaced when the session ends in the same request', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const sessionManager = createCustomerSessionManager(request(await signIn()))

    await sessionManager.setSessionItem(HYDROGEN_SESSION_KEY, createHydrogenSession({ accessToken: 'rotated-access-token' }))
    await sessionManager.removeSessionItem(HYDROGEN_SESSION_KEY)

    expect(useTokenStorage('customer-account-token').items.size).toBe(0)
  })
})

describe('getCustomerAccountSession', () => {
  it('reports a logged out session without the session cookie, and sets no cookie', async () => {
    const event = request()

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: false })
    expect(getSetCookieHeaders(event)).toEqual([])
  })

  it('reports the signed in customer', async () => {
    await expect(getCustomerAccountSession(request(await signIn()))).resolves.toEqual({ isLoggedIn: true })
  })

  it('counts a session with an expired access token as signed in, without refreshing it', async () => {
    const event = request(await signIn(EXPIRED))

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(getSetCookieHeaders(event)).toEqual([])
  })

  it('reports logged out for an expired session that cannot be refreshed', async () => {
    const event = request(await signIn({ ...EXPIRED, refreshToken: undefined }))

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: false })
  })

  it('treats a session without tokens as anonymous, without marking the response personalized', async () => {
    const signedOut = request(await signIn())

    await createCustomerSessionManager(signedOut).removeSessionItem(HYDROGEN_SESSION_KEY)

    const event = request(toCookieHeader(signedOut))

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: false })
    expect(event.context.shopifyRequestContext).toBeUndefined()
  })

  it.each([
    ['isr', { isr: 60 }],
    ['swr', { cache: { swr: true, maxAge: 60 } }],
    ['cache', { cache: { maxAge: 60 } }],
  ])('renders a page cached by its %s route rule for an anonymous visitor, as a shared cache keeps the render', async (_, routeRules) => {
    const event = request(await signIn())

    event.context._nitro = { routeRules }

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: false })
    await expect(createCustomerSessionManager(event).getSessionItem(HYDROGEN_SESSION_KEY)).resolves.toBeUndefined()
  })

  it('reads the session on routes whose caching is turned off', async () => {
    const event = request(await signIn())

    event.context._nitro = { routeRules: { cache: false, isr: false } }

    await expect(getCustomerAccountSession(event)).resolves.toEqual({ isLoggedIn: true })
  })
})

describe('requireCustomerAccountSession', () => {
  it('rejects an anonymous request with the same message as a customer account request', async () => {
    await expect(requireCustomerAccountSession(request())).rejects.toMatchObject({
      statusCode: 401,
      message: '[shopify] No customer account session: the customer is not logged in',
    })
  })

  it('returns the session of a signed in customer', async () => {
    await expect(requireCustomerAccountSession(request(await signIn()))).resolves.toEqual({ isLoggedIn: true })
  })
})

describe('clearCustomerAccountSession', () => {
  it('ends the session so a later read is logged out', async () => {
    const event = request(await signIn(), { method: 'POST' })

    await clearCustomerAccountSession(event)

    const cookie = toCookieHeader(event)

    expect(cookie).not.toContain('__Host-session=')
    await expect(getCustomerAccountSession(request(cookie))).resolves.toMatchObject({ isLoggedIn: false })
  })

  it('deletes the stored tokens', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    await clearCustomerAccountSession(request(await signIn(), { method: 'POST' }))

    expect(useTokenStorage('customer-account-token').items.size).toBe(0)
  })

  it('does nothing without a session cookie', async () => {
    const event = request(undefined, { method: 'POST' })

    await clearCustomerAccountSession(event)

    expect(getSetCookieHeaders(event)).toEqual([])
  })
})
