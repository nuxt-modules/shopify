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
  it.each([
    ['an anonymous', () => Promise.resolve(undefined), false],
    ['a signed in', () => signIn(), true],
  ])('reports the session to %s request and never caches the response', async (_, cookie, isLoggedIn) => {
    const event = request(await cookie())

    await expect(handler(event)).resolves.toEqual({ isLoggedIn })
    expect(event.node.res.getHeader('cache-control')).toBe('no-store')
  })
})
