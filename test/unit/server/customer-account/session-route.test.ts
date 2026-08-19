import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, createNoopStorage, createShopifyConfig, createTokenSet } from '#test/helpers/customer-account'
import { createTestEvent, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const getValidCustomerAccessToken = vi.fn()

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useStorage: () => createNoopStorage(),
}))

vi.mock('#src/runtime/server/utils/customer-account/auth', () => ({
  getValidCustomerAccessToken: (...args: unknown[]) => getValidCustomerAccessToken(...args as []),
}))

const handler = (await import('#src/runtime/server/api/auth/customer-account/session')).default
const { setCustomerAccountSession } = await import('#src/runtime/server/utils/customer-account/session')

const TOKENS = createTokenSet()

async function sessionEvent() {
  const login = createTestEvent({ method: 'POST' })

  await setCustomerAccountSession(login, { user: CUSTOMER, tokens: TOKENS, loggedInAt: 1_700_000_000_000 })

  return createTestEvent({
    path: '/_auth/customer-account/session',
    headers: { cookie: toCookieHeader(login) },
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  getValidCustomerAccessToken.mockResolvedValue('access-token')

  runtimeConfig._shopify = createShopifyConfig()
})

describe('customer account session route', () => {
  it('reports a logged out session for an anonymous request', async () => {
    await expect(handler(createTestEvent({ path: '/_auth/customer-account/session' })))
      .resolves.toEqual({ loggedIn: false, user: null, loggedInAt: null })
  })

  it('never caches the response', async () => {
    const event = createTestEvent({ path: '/_auth/customer-account/session' })

    await handler(event)

    expect(event.node.res.getHeader('cache-control')).toBe('no-store')
  })

  it('sets the no-store header for an authenticated request too', async () => {
    const event = await sessionEvent()

    await handler(event)

    expect(event.node.res.getHeader('cache-control')).toBe('no-store')
  })

  it('does not check the access token for an anonymous request', async () => {
    await handler(createTestEvent({ path: '/_auth/customer-account/session' }))

    expect(getValidCustomerAccessToken).not.toHaveBeenCalled()
  })

  it('returns the session when the access token is still usable', async () => {
    await expect(handler(await sessionEvent())).resolves.toEqual({
      loggedIn: true,
      user: CUSTOMER,
      loggedInAt: 1_700_000_000_000,
    })
  })

  it('reports logged out when the access token can no longer be refreshed', async () => {
    getValidCustomerAccessToken.mockRejectedValue(
      Object.assign(new Error('expired'), { statusCode: 401 }),
    )

    await expect(handler(await sessionEvent())).resolves.toEqual({
      loggedIn: false,
      user: null,
      loggedInAt: null,
    })
  })

  it('does not leak the customer when the token check fails', async () => {
    getValidCustomerAccessToken.mockRejectedValue(new Error('boom'))

    const result = await handler(await sessionEvent()) as { user: unknown }

    expect(result.user).toBeNull()
  })

  it('never exposes tokens in the response', async () => {
    const result = await handler(await sessionEvent())

    expect(JSON.stringify(result)).not.toContain('access-token')
    expect(JSON.stringify(result)).not.toContain('refresh-token')
  })
})
