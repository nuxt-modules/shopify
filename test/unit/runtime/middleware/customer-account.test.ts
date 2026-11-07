import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const nuxtApp = { isHydrating: false }

const session = {
  isLoggedIn: ref(false),
  isReady: ref(false),
  fetch: vi.fn(),
  login: vi.fn((options: { returnTo: string }) => `/account/login?return_to=${options.returnTo}`),
}

vi.mock('#app', () => ({
  defineNuxtRouteMiddleware: (middleware: unknown) => middleware,
  useNuxtApp: () => nuxtApp,
}))

vi.mock('#src/runtime/composables/customer-account/session', () => ({
  useCustomerAccountSession: () => session,
}))

const middleware = (await import('#src/runtime/middleware/customer-account')).default as unknown as (to: { fullPath: string }) => Promise<unknown>

const TO = { fullPath: '/account/orders?page=2' }

function inBrowser({ hydrating = false } = {}) {
  vi.stubGlobal('__NUXT_CLIENT__', true)

  nuxtApp.isHydrating = hydrating
}

beforeEach(() => {
  vi.clearAllMocks()

  session.isLoggedIn.value = true
  session.isReady.value = false
  nuxtApp.isHydrating = false
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('customer-account route middleware', () => {
  it('fetches the session before the first check', async () => {
    await middleware(TO)

    expect(session.fetch).toHaveBeenCalledOnce()
  })

  it('reuses the session fetched during server rendering while hydrating', async () => {
    inBrowser({ hydrating: true })
    session.isReady.value = true

    await middleware(TO)

    expect(session.fetch).not.toHaveBeenCalled()
  })

  it('fetches the session again on client-side navigation, so a session that ended is noticed', async () => {
    inBrowser()
    session.isReady.value = true

    await middleware(TO)

    expect(session.fetch).toHaveBeenCalledOnce()
  })

  it('reads the session only once during server rendering', async () => {
    session.isReady.value = true

    await middleware(TO)

    expect(session.fetch).not.toHaveBeenCalled()
  })

  it('lets a signed in customer through', async () => {
    await expect(middleware(TO)).resolves.toBeUndefined()

    expect(session.login).not.toHaveBeenCalled()
  })

  it('sends an anonymous customer to the login and back to the requested page', async () => {
    session.isLoggedIn.value = false

    await expect(middleware(TO)).resolves.toBe('/account/login?return_to=/account/orders?page=2')

    expect(session.login).toHaveBeenCalledWith({ returnTo: TO.fullPath })
  })
})
