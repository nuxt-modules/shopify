import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { SESSION_DEFAULT_NAME } from '#src/runtime/utils/session'

const sessionRoute = '_auth/customer-account/session'

const requests: string[] = []
const state = new Map<string, ReturnType<typeof ref>>()

let sessionName: string | undefined = SESSION_DEFAULT_NAME
let requestCookie: string | undefined

const loggedIn = { loggedIn: true, user: { id: 'gid://shopify/Customer/1' }, loggedInAt: 1 }

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),

  useRuntimeConfig: () => ({
    public: {
      _shopify: {
        clients: {
          customerAccount: {
            clientId: 'cid',
            routes: { callback: '_auth/customer-account/callback', logout: '_auth/customer-account/logout', session: sessionRoute },
            afterLogin: '/',
            dev: { bridgeURL: '_auth/customer-account/bridge' },
            ...(sessionName === undefined ? {} : { session: { name: sessionName } }),
          },
        },
      },
    },
  }),

  useState: (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))

    return state.get(key)
  },

  useRequestHeaders: (names: string[]) =>
    Object.fromEntries(names.map(name => [name, name === 'cookie' ? requestCookie : undefined]).filter(([, value]) => value)),

  useRequestFetch: () => (path: string) => {
    requests.push(path)

    return Promise.resolve(loggedIn)
  },

  navigateTo: (url: string) => url,
}))

const { useCustomerAccountSession } = await import('#src/runtime/composables/customer-account/session')

beforeEach(() => {
  requests.length = 0
  state.clear()

  sessionName = SESSION_DEFAULT_NAME
  requestCookie = undefined
})

describe('server side session fetching', () => {
  it('never calls the session route when the request carries no cookies', async () => {
    const { fetch, ready, isLoggedIn } = useCustomerAccountSession()

    await fetch()

    expect(requests).toHaveLength(0)
    expect(ready.value).toBe(true)
    expect(isLoggedIn.value).toBe(false)
  })

  it('never calls the session route when no session cookie is present', async () => {
    requestCookie = '_shopify_y=abc; other=1'

    const { fetch, isLoggedIn } = useCustomerAccountSession()

    await fetch()

    expect(requests).toHaveLength(0)
    expect(isLoggedIn.value).toBe(false)
  })

  it('calls the session route when the session cookie is present', async () => {
    requestCookie = `other=1; ${SESSION_DEFAULT_NAME}=sealed`

    const { fetch, isLoggedIn, user } = useCustomerAccountSession()

    await fetch()

    expect(requests).toStrictEqual([`/${sessionRoute}`])
    expect(isLoggedIn.value).toBe(true)
    expect(user.value?.id).toBe('gid://shopify/Customer/1')
  })

  it('matches the configured cookie name rather than the default', async () => {
    sessionName = 'my-session'
    requestCookie = `${SESSION_DEFAULT_NAME}=sealed`

    await useCustomerAccountSession().fetch()

    expect(requests).toHaveLength(0)

    requestCookie = 'my-session=sealed'

    await useCustomerAccountSession().fetch()

    expect(requests).toStrictEqual([`/${sessionRoute}`])
  })

  it('reads the request cookie once per composable rather than per fetch', async () => {
    requestCookie = undefined

    const { fetch } = useCustomerAccountSession()

    requestCookie = `${SESSION_DEFAULT_NAME}=sealed`

    await fetch()

    expect(requests).toHaveLength(0)
  })

  it('falls back to the default cookie name when the public config has none', async () => {
    sessionName = undefined
    requestCookie = `${SESSION_DEFAULT_NAME}=sealed`

    const { fetch } = useCustomerAccountSession()

    await fetch()

    expect(requests).toStrictEqual([`/${sessionRoute}`])
  })

  it('never matches a cookie whose name merely ends with the session name', async () => {
    requestCookie = `not-${SESSION_DEFAULT_NAME}=sealed`

    const { fetch } = useCustomerAccountSession()

    await fetch()

    expect(requests).toHaveLength(0)
  })
})
