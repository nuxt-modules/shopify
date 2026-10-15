import { describe, expect, it, vi } from 'vitest'

const createStorefrontClient = vi.fn((..._args: unknown[]) => ({}))

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { _shopify: {} } }),
  useNuxtApp: () => ({ payload: {}, hooks: { callHook: vi.fn() } }),
  useRequestURL: () => new URL('https://app.example.workers.dev/'),
  useRequestEvent: () => undefined,
}))

vi.mock('#src/runtime/utils/clients/storefront', () => ({ createStorefrontClient }))

const { useStorefront } = await import('#src/runtime/composables/storefront/client')

describe('useStorefront', () => {
  it('does not route through its own origin during SSR', () => {
    useStorefront()

    expect(createStorefrontClient.mock.calls[0]?.[1]).toMatchObject({ origin: undefined })
  })
})
