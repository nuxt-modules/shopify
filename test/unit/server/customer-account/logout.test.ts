import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, UNCONFIGURED_SHOPIFY_CONFIG, createNoopStorage, createShopifyConfig, createTokenSet } from '#test/helpers/customer-account'
import { createTestEvent, getResponseHeader, toCookieHeader } from '#test/helpers/event'

const TOKENS = createTokenSet()

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const hooks = { callHook: vi.fn(() => Promise.resolve()) }

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
      end_session_endpoint: 'https://shopify.example/oauth/logout',
    }),
  }
})

const handler = (await import('#src/runtime/server/api/auth/customer-account/logout')).default
const { getCustomerAccountSession, setCustomerAccountSession }
  = await import('#src/runtime/server/utils/customer-account/session')

const logoutEvent = (headers: Record<string, string> = {}) =>
  createTestEvent({ method: 'GET', path: '/_auth/customer-account/logout', headers })

async function loggedInLogoutEvent(headers: Record<string, string> = {}) {
  const login = createTestEvent({ method: 'POST' })

  await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: Date.now() })

  return logoutEvent({ ...headers, cookie: toCookieHeader(login) })
}

beforeEach(() => {
  vi.clearAllMocks()

  runtimeConfig._shopify = createShopifyConfig({
    afterLogout: '/goodbye',
  })
})

describe('customer account logout', () => {
  it('rejects a cross-site fetch', async () => {
    await expect(handler(logoutEvent({ 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a cross-site top level navigation', async () => {
    const event = logoutEvent({ 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' })

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/goodbye')
  })

  it('allows a same-origin request', async () => {
    const event = logoutEvent({ 'sec-fetch-site': 'same-origin' })

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/goodbye')
  })

  it('fails when the customer account client is not configured', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(logoutEvent())).rejects.toMatchObject({ statusCode: 500 })
  })

  it('does not run the csrf check before the configuration check', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(logoutEvent({ 'sec-fetch-site': 'cross-site' })))
      .rejects.toMatchObject({ statusCode: 500 })
  })

  it('clears an authenticated session', async () => {
    const event = await loggedInLogoutEvent()

    await handler(event)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: false, user: null })
  })

  it('ends the shopify session and returns to afterLogout', async () => {
    const event = await loggedInLogoutEvent()

    await handler(event)

    const target = new URL(getResponseHeader(event, 'location'))

    expect(target.origin + target.pathname).toBe('https://shopify.example/oauth/logout')
    expect(target.searchParams.get('id_token_hint')).toBe('id-token')
    expect(target.searchParams.get('post_logout_redirect_uri')).toMatch(/\/goodbye$/)
  })

  it('clears the local session before handing off to shopify', async () => {
    const event = await loggedInLogoutEvent()

    await handler(event)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: false })
  })

  it('calls the logout hook with the customer and id token', async () => {
    const event = await loggedInLogoutEvent()

    await handler(event)

    expect(hooks.callHook).toHaveBeenCalledWith(
      'customer-account:auth:logout',
      { user: CUSTOMER, idToken: 'id-token' },
    )
  })

  it('is a no-op redirect for an anonymous request', async () => {
    const event = logoutEvent()

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/goodbye')
    expect(hooks.callHook).toHaveBeenCalledWith(
      'customer-account:auth:logout',
      { user: null, idToken: undefined },
    )
  })
})
