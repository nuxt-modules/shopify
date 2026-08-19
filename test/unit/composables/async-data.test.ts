import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const storefrontRequests: unknown[] = []
const customerAccountRequests: unknown[] = []

vi.mock('#app', () => ({
  createError: (error: unknown) => new Error(JSON.stringify(error)),
  useAsyncData: (...args: unknown[]) => {
    const handler = (typeof args[0] === 'function' ? args[0] : args[1]) as () => Promise<unknown>

    return { refresh: handler }
  },
}))

vi.mock('#src/runtime/composables/storefront/client.ts', () => ({
  useStorefront: () => ({
    request: (_operation: string, options: { variables?: Record<string, unknown> }) => {
      storefrontRequests.push(structuredClone(options.variables))

      return Promise.resolve({ data: {} })
    },
  }),
}))

vi.mock('#src/runtime/composables/customer-account/client.ts', () => ({
  useCustomerAccount: () => ({
    request: (_operation: string, options: { variables?: Record<string, unknown> }) => {
      customerAccountRequests.push(structuredClone(options.variables))

      return Promise.resolve({ data: {} })
    },
  }),
}))

const { useStorefrontData } = await import('#src/runtime/composables/storefront/async')
const { useCustomerAccountData } = await import('#src/runtime/composables/customer-account/async')

type Refreshable = { refresh: () => Promise<unknown> }

describe('async data variables', () => {
  it('re-reads storefront ref variables on every request', async () => {
    const handle = ref('first')

    const { refresh } = useStorefrontData('key', 'query' as never, { variables: { handle } } as never) as unknown as Refreshable

    await refresh()
    handle.value = 'second'
    await refresh()

    expect(storefrontRequests).toStrictEqual([{ handle: 'first' }, { handle: 'second' }])
  })

  it('re-reads customer account ref variables on every request', async () => {
    const id = ref('1')

    const { refresh } = useCustomerAccountData('key', 'query' as never, { variables: { id } } as never) as unknown as Refreshable

    await refresh()
    id.value = '2'
    await refresh()

    expect(customerAccountRequests).toStrictEqual([{ id: '1' }, { id: '2' }])
  })

  it('leaves the caller\'s variables object untouched', async () => {
    const handle = ref('first')
    const variables = { handle }

    const { refresh } = useStorefrontData('key', 'query' as never, { variables } as never) as unknown as Refreshable

    await refresh()

    expect(variables.handle).toBe(handle)
    expect(handle.value).toBe('first')
  })
})
