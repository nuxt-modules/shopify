import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

type CustomerAccountContext = { getSession: (event: unknown) => Promise<unknown> }

const SESSION_ROUTE = '/account/session'

const SIGNED_IN = { isLoggedIn: true }

const SIGNED_OUT = { isLoggedIn: false }

const navigations: unknown[][] = []
const state = new Map<string, ReturnType<typeof ref>>()

const fetchSession = vi.fn()

let configured = true
let requestEvent: { context: { shopifyCustomerAccount?: CustomerAccountContext } } | undefined

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),

  useRuntimeConfig: () => ({
    public: {
      _shopify: {
        clients: configured ? { customerAccount: {} } : {},
      },
    },
  }),

  useState: (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))

    return state.get(key)
  },

  useRequestEvent: () => requestEvent,

  navigateTo: (...args: unknown[]) => {
    navigations.push(args)

    return args[0]
  },
}))

const { useCustomerAccountSession } = await import('#src/runtime/composables/customer-account/session')

function onServer(customerAccount?: CustomerAccountContext) {
  vi.stubGlobal('__NUXT_SERVER__', true)

  requestEvent = { context: customerAccount ? { shopifyCustomerAccount: customerAccount } : {} }
}

beforeEach(() => {
  navigations.length = 0
  state.clear()

  configured = true
  requestEvent = undefined

  fetchSession.mockReset()
  vi.stubGlobal('$fetch', fetchSession)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCustomerAccountSession', () => {
  it('throws when the customer account client is not configured', () => {
    configured = false

    expect(() => useCustomerAccountSession()).toThrow(expect.objectContaining({ statusCode: 500 }))
  })

  it('starts out logged out and not ready yet', () => {
    const { isLoggedIn, isReady } = useCustomerAccountSession()

    expect(isLoggedIn.value).toBe(false)
    expect(isReady.value).toBe(false)
  })
})

describe('fetching the session during server rendering', () => {
  it('reads the session of the request it renders without calling the session route', async () => {
    const getSession = vi.fn(() => Promise.resolve(SIGNED_IN))

    onServer({ getSession })

    const { fetch, isLoggedIn, isReady } = useCustomerAccountSession()

    await fetch()

    expect(getSession).toHaveBeenCalledExactlyOnceWith(requestEvent)
    expect(fetchSession).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(true)
    expect(isReady.value).toBe(true)
  })

  it('reports logged out when the request carries no customer account', async () => {
    onServer()

    const { fetch, isLoggedIn, isReady } = useCustomerAccountSession()

    await fetch()

    expect(isLoggedIn.value).toBe(false)
    expect(isReady.value).toBe(true)
  })

  it('reports logged out when the session cannot be read', async () => {
    onServer({ getSession: () => Promise.reject(new Error('unsealing failed')) })

    const { fetch, isLoggedIn, isReady } = useCustomerAccountSession()

    await fetch()

    expect(isLoggedIn.value).toBe(false)
    expect(isReady.value).toBe(true)
  })
})

describe('fetching the session in the browser', () => {
  it('asks the session route', async () => {
    fetchSession.mockResolvedValue(SIGNED_IN)

    const { fetch, isLoggedIn } = useCustomerAccountSession()

    await fetch()

    expect(fetchSession).toHaveBeenCalledWith(SESSION_ROUTE, { headers: { accept: 'application/json' } })
    expect(isLoggedIn.value).toBe(true)
  })

  it('replaces a session that ended in the meantime', async () => {
    fetchSession.mockResolvedValueOnce(SIGNED_IN).mockResolvedValueOnce(SIGNED_OUT)

    const { fetch, isLoggedIn } = useCustomerAccountSession()

    await fetch()
    await fetch()

    expect(isLoggedIn.value).toBe(false)
  })

  it('reports logged out when the session route fails', async () => {
    fetchSession.mockRejectedValue(new Error('offline'))

    const { fetch, isLoggedIn, isReady } = useCustomerAccountSession()

    await fetch()

    expect(isLoggedIn.value).toBe(false)
    expect(isReady.value).toBe(true)
  })
})

describe('login', () => {
  it('navigates to Hydrogen\'s login route with the requested options', () => {
    useCustomerAccountSession().login({
      loginHint: 'customer@example.com',
      loginHintMode: 'submit',
      locale: 'de',
      acrValues: 'b2b',
      returnTo: '/account/orders',
    })

    const [url, options] = navigations.at(-1) as [string, unknown]
    const target = new URL(url, 'https://shop.test')

    expect(target.pathname).toBe('/account/login')
    expect(Object.fromEntries(target.searchParams)).toEqual({
      login_hint: 'customer@example.com',
      login_hint_mode: 'submit',
      locale: 'de',
      acr_values: 'b2b',
      return_to: '/account/orders',
    })
    expect(options).toEqual({ external: true })
  })

  it('navigates to the bare login route without options', () => {
    useCustomerAccountSession().login()

    expect(navigations.at(-1)).toEqual(['/account/login', { external: true }])
  })
})

describe('logout', () => {
  it('does nothing during server rendering', () => {
    onServer()

    expect(() => useCustomerAccountSession().logout()).not.toThrow()
  })
})
