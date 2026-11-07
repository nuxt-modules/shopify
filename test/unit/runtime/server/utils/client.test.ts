import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestEvent = { context: {} }
const configuredFor: unknown[] = []

vi.mock('nitropack/runtime', () => ({
  getRouteRules: () => ({}),
  useEvent: () => requestEvent,
  useNitroApp: () => ({ hooks: { callHook: vi.fn() } }),
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: (event?: unknown) => {
    configuredFor.push(event)

    return { _shopify: {} }
  },
}))

vi.mock('#src/runtime/utils/clients/storefront', () => ({ createStorefrontApiClient: vi.fn(() => ({})) }))
vi.mock('#src/runtime/utils/clients/admin', () => ({ createAdminApiClient: vi.fn(() => ({})) }))
vi.mock('#src/runtime/utils/clients/customer-account', () => ({ createCustomerAccountApiClient: vi.fn(() => ({})) }))
vi.mock('#src/runtime/server/utils/customer-account/auth', () => ({ getValidCustomerAccessToken: vi.fn() }))

const { useStorefront } = await import('#src/runtime/server/utils/storefront/client')
const { useAdmin } = await import('#src/runtime/server/utils/admin/client')
const { useCustomerAccount } = await import('#src/runtime/server/utils/customer-account/client')

beforeEach(() => {
  configuredFor.length = 0
})

describe('server clients', () => {
  it.each([
    ['useStorefront', useStorefront],
    ['useAdmin', useAdmin],
    ['useCustomerAccount', useCustomerAccount],
  ])('%s reads the runtime config of the current request when called without an event', (_, useClient) => {
    useClient()

    expect(configuredFor).toEqual([requestEvent])
  })
})
