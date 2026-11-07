import { afterEach, describe, expect, it, vi } from 'vitest'

const createStorefrontApiClient = vi.fn((..._args: unknown[]) => ({}))

const serverCache = vi.fn()

let requestEvent: { context: Record<string, unknown> } | undefined

let baseURL = '/'

const payload: { prerenderedAt?: number } = {}

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ app: { baseURL }, public: { _shopify: {} } }),
  useNuxtApp: () => ({ payload, hooks: { callHook: vi.fn() } }),
  useRequestURL: () => new URL('https://app.example.workers.dev/'),
  useRequestEvent: () => requestEvent,
}))

vi.mock('#src/runtime/utils/clients/storefront', () => ({ createStorefrontApiClient }))

const { useStorefront } = await import('#src/runtime/composables/storefront/client')

const lastOptions = () => createStorefrontApiClient.mock.calls.at(-1)?.[1] as { origin?: string } | undefined

afterEach(() => {
  vi.unstubAllGlobals()

  baseURL = '/'

  requestEvent = undefined
  delete payload.prerenderedAt
})

describe('useStorefront', () => {
  it('calls Shopify directly during SSR, caching through the server cache', () => {
    vi.stubGlobal('__NUXT_SERVER__', true)

    requestEvent = { context: { shopifyStorefrontCache: serverCache } }

    useStorefront()

    expect(lastOptions()).toMatchObject({ event: requestEvent, serverCache })
    expect(lastOptions()?.origin).toBeUndefined()
  })

  it('reaches Shopify through its own origin in the browser, without a server cache', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    useStorefront()

    expect(lastOptions()).toMatchObject({ origin: 'https://app.example.workers.dev', serverCache: undefined })
  })

  it('reaches Hydrogen\'s proxy at the domain root, where its routes are served, even under an app base URL', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    baseURL = '/shop/'

    useStorefront()

    expect(lastOptions()).toMatchObject({ origin: 'https://app.example.workers.dev' })
  })

  it('keeps going through the proxy after a prerendered landing page', () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    payload.prerenderedAt = Date.now()

    useStorefront()

    expect(lastOptions()).toMatchObject({ origin: 'https://app.example.workers.dev' })
  })
})
