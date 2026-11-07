import { afterEach, describe, expect, it, vi } from 'vitest'

type ClientOptions = {
  origin?: string
  auth?: () => Promise<string>
}

const createCustomerAccountApiClient = vi.fn((..._args: unknown[]) => ({}))

let requestEvent: { context: Record<string, unknown> } | undefined

const payload: { prerenderedAt?: number } = {}

let baseURL = '/'

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ app: { baseURL }, public: { _shopify: {} } }),
  useNuxtApp: () => ({ payload, hooks: { callHook: vi.fn() } }),
  useRequestURL: () => new URL('https://shop.test/account'),
  useRequestEvent: () => requestEvent,
}))

vi.mock('#src/runtime/utils/clients/customer-account', () => ({ createCustomerAccountApiClient }))

const { useCustomerAccount } = await import('#src/runtime/composables/customer-account/client')

const lastOptions = () => createCustomerAccountApiClient.mock.calls.at(-1)?.[1] as ClientOptions

function renderEvent() {
  const getAccessToken = vi.fn(() => Promise.resolve('access-token'))

  return { getAccessToken, event: { context: { shopifyCustomerAccount: { getAccessToken } } } }
}

afterEach(() => {
  vi.unstubAllGlobals()

  baseURL = '/'

  requestEvent = undefined
  delete payload.prerenderedAt
})

describe('useCustomerAccount', () => {
  it('authenticates server rendering with the access token of the request it renders', async () => {
    vi.stubGlobal('__NUXT_SERVER__', true)

    const { getAccessToken, event } = renderEvent()

    requestEvent = event

    useCustomerAccount()

    await expect(lastOptions().auth!()).resolves.toBe('access-token')
    expect(getAccessToken).toHaveBeenCalledExactlyOnceWith(event)
    expect(lastOptions().origin).toBeUndefined()
  })

  it('authenticates with the token of an explicitly passed event', async () => {
    vi.stubGlobal('__NUXT_SERVER__', true)

    const { getAccessToken, event } = renderEvent()

    useCustomerAccount(event as never)

    await lastOptions().auth!()

    expect(getAccessToken).toHaveBeenCalledExactlyOnceWith(event)
  })

  it('goes through the proxy in the browser, without a token of its own', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    useCustomerAccount()

    expect(lastOptions().origin).toBe('https://shop.test')
    expect(lastOptions().auth).toBeUndefined()
  })

  it('keeps going through the proxy after a prerendered landing page', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    payload.prerenderedAt = Date.now()

    useCustomerAccount()

    expect(lastOptions().origin).toBe('https://shop.test')
  })

  it('reaches the proxy at the domain root, next to the sign-in routes, even under an app base URL', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    baseURL = '/shop/'

    useCustomerAccount()

    expect(lastOptions().origin).toBe('https://shop.test')
  })
})
