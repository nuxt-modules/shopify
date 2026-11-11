import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createHttpsEvent,
  createSessionCookie as signIn,
  createShopifyConfig,
} from '#test/helpers/customer-account'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

vi.stubGlobal('fetch', vi.fn())

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({ getRouteRules: () => ({}), useStorage: vi.fn() }))

const handler = (await import('#src/runtime/server/api/customer-account/session')).default

const SESSION_PATH = '/account/session'

const request = (cookie?: string) => createHttpsEvent(cookie, { path: SESSION_PATH })

beforeEach(() => {
  runtimeConfig._shopify = createShopifyConfig()
})

describe('customer account session route', () => {
  it('reports the session to a signed in request and never caches the response', async () => {
    const event = request(await signIn())

    await expect(handler(event)).resolves.toEqual({ isLoggedIn: true })
    expect(event.node.res.getHeader('cache-control')).toBe('no-store')
  })
})
