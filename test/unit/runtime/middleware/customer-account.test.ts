import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const nuxtApp = { isHydrating: false }

const session = {
  isLoggedIn: ref(false),
  isReady: ref(false),
  fetch: vi.fn(() => {
    session.isReady.value = true
  }),
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
  it.each([
    ['before the first check', undefined, false, 1],
    ['only once during server rendering', undefined, true, 0],
    ['only once, reusing the one from server rendering while hydrating', { hydrating: true }, true, 0],
    ['again on client-side navigation, so a session that ended is noticed', { hydrating: false }, true, 1],
  ])('fetches the session %s', async (_, browser, ready, fetches) => {
    if (browser) inBrowser(browser)

    session.isReady.value = ready

    await middleware(TO)

    expect(session.fetch).toHaveBeenCalledTimes(fetches)
  })

  it('lets a signed in customer through', async () => {
    await expect(middleware(TO)).resolves.toBeUndefined()

    expect(session.login).not.toHaveBeenCalled()
  })

  it('leaves the check to the browser when the server can\'t read the session for this page', async () => {
    session.isLoggedIn.value = false
    session.fetch.mockImplementationOnce(() => {})

    await expect(middleware(TO)).resolves.toBeUndefined()

    expect(session.login).not.toHaveBeenCalled()
  })

  it('sends an anonymous customer to the login and back to the requested page', async () => {
    session.isLoggedIn.value = false

    await expect(middleware(TO)).resolves.toBe('/account/login?return_to=/account/orders?page=2')

    expect(session.login).toHaveBeenCalledWith({ returnTo: TO.fullPath })
  })
})
