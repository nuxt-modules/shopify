import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER, UNCONFIGURED_SHOPIFY_CONFIG, createNoopStorage, createShopifyConfig, createTokenSet } from '#test/helpers/customer-account'
import { createTestEvent, getResponseHeader, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useStorage: () => createNoopStorage(),
}))

// The bridge only exists while developing against a tunnelled callback host.
vi.stubGlobal('__NUXT_DEV__', true)

const handler = (await import('#src/runtime/server/api/auth/customer-account/bridge')).default
const { createBridgeNonce } = await import('#src/runtime/server/utils/customer-account/bridge')
const { getCustomerAccountSession } = await import('#src/runtime/server/utils/customer-account/session')

const TOKENS = createTokenSet()

const bridgeEvent = (query = '') =>
  createTestEvent({ method: 'GET', path: `/_auth/customer-account/bridge${query}` })

beforeEach(() => {
  runtimeConfig._shopify = createShopifyConfig({
    afterLogin: '/account',
  })
})

describe('customer account dev bridge route', () => {
  it('rejects a request without a nonce', async () => {
    await expect(handler(bridgeEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects an empty nonce', async () => {
    await expect(handler(bridgeEvent('?nonce='))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a nonce that was never issued', async () => {
    await expect(handler(bridgeEvent(`?nonce=${crypto.randomUUID()}`)))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a repeated array style nonce', async () => {
    await expect(handler(bridgeEvent('?nonce=a&nonce=b'))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('fails when the customer account client is not configured', async () => {
    runtimeConfig._shopify = UNCONFIGURED_SHOPIFY_CONFIG

    await expect(handler(bridgeEvent('?nonce=anything'))).rejects.toMatchObject({ statusCode: 500 })
  })

  it('creates a session from a valid nonce', async () => {
    const nonce = createBridgeNonce({ user: CUSTOMER, tokens: TOKENS })

    const event = bridgeEvent(`?nonce=${nonce}`)

    await handler(event)

    const next = createTestEvent({ headers: { cookie: toCookieHeader(event) } })

    await expect(getCustomerAccountSession(next)).resolves.toMatchObject({ loggedIn: true, user: CUSTOMER })
  })

  it('redirects to the remembered return path', async () => {
    const nonce = createBridgeNonce({ user: CUSTOMER, tokens: TOKENS, returnTo: '/account/orders' })

    const event = bridgeEvent(`?nonce=${nonce}`)

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/account/orders')
  })

  it('falls back to afterLogin when nothing was remembered', async () => {
    const nonce = createBridgeNonce({ user: CUSTOMER, tokens: TOKENS })

    const event = bridgeEvent(`?nonce=${nonce}`)

    await handler(event)

    expect(getResponseHeader(event, 'location')).toBe('/account')
  })

  it('rejects a nonce that was already used', async () => {
    const nonce = createBridgeNonce({ user: CUSTOMER, tokens: TOKENS })

    await handler(bridgeEvent(`?nonce=${nonce}`))

    await expect(handler(bridgeEvent(`?nonce=${nonce}`))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('does not exist outside of dev', async () => {
    const nonce = createBridgeNonce({ user: CUSTOMER, tokens: TOKENS })

    vi.stubGlobal('__NUXT_DEV__', false)

    await expect(handler(bridgeEvent(`?nonce=${nonce}`))).rejects.toMatchObject({ statusCode: 404 })

    vi.stubGlobal('__NUXT_DEV__', true)
  })
})
