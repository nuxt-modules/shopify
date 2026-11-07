import type { NuxtError } from '#app'

import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { ref } from 'vue'

declare module '@nuxtjs/shopify/storefront' {
  interface StorefrontQueries {
    'query Shop': { variables: { handle?: string }, return: { shop: { name: string }, localization: { country: string } } }
  }
}

declare module '@nuxtjs/shopify/customer-account' {
  interface CustomerAccountQueries {
    'query Customer': { variables: { first?: number }, return: { customer: { id: string } } }
  }
}

const storefrontRequests: unknown[] = []
const customerAccountRequests: unknown[] = []
const storefrontSignals: unknown[] = []

vi.mock('#app', () => ({
  createError: (error: unknown) => new Error(JSON.stringify(error)),
  useAsyncData: (...args: unknown[]) => {
    const handler = (typeof args[0] === 'function' ? args[0] : args[1]) as (nuxtApp: unknown, context: { signal: AbortSignal }) => Promise<unknown>

    return { key: args[0], refresh: (signal = new AbortController().signal) => handler({}, { signal }) }
  },
}))

vi.mock('#src/runtime/composables/storefront/client.ts', () => ({
  useStorefront: () => ({
    request: (_operation: string, options: { variables?: Record<string, unknown>, signal?: AbortSignal }) => {
      storefrontRequests.push(structuredClone(options.variables))
      storefrontSignals.push(options.signal)

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

type Refreshable = { key: unknown, refresh: (signal?: AbortSignal) => Promise<unknown> }

beforeEach(() => {
  storefrontRequests.length = 0
  customerAccountRequests.length = 0
  storefrontSignals.length = 0
})

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

describe('async data requests', () => {
  it('reads the options of a call without a key, even when the compiler added none', async () => {
    const { refresh } = useStorefrontData('query { shop { name } }' as never, { variables: { first: 1 } } as never) as unknown as Refreshable

    await refresh()

    expect(storefrontRequests).toStrictEqual([{ first: 1 }])
  })

  it('lets Nuxt cancel a request it no longer needs', async () => {
    const controller = new AbortController()
    const { refresh } = useStorefrontData('key', 'query { shop { name } }' as never) as unknown as Refreshable

    await refresh(controller.signal)

    expect(storefrontSignals).toStrictEqual([controller.signal])
  })

  it('keeps the caller\'s own signal over Nuxt\'s', async () => {
    const own = new AbortController().signal
    const { refresh } = useStorefrontData('key', 'query { shop { name } }' as never, { signal: own } as never) as unknown as Refreshable

    await refresh(new AbortController().signal)

    expect(storefrontSignals).toStrictEqual([own])
  })
})

describe('async data types', () => {
  type Shop = { shop: { name: string }, localization: { country: string } }

  it('types the storefront data by the operation, `transform` and `pick`', () => {
    const results = () => ({
      data: useStorefrontData('query Shop', { variables: { handle: ref('handle') }, cache: 'short' }).data.value,
      transformed: useStorefrontData('key', 'query Shop', { transform: data => data.shop.name }).data.value,
      awaited: useStorefrontData('query Shop', { transform: async data => data.localization.country.length }).data.value,
      picked: useStorefrontData('query Shop', { pick: ['shop'] }).data.value,
      error: useStorefrontData('query Shop').error.value,
    })

    expectTypeOf(results).returns.toEqualTypeOf<{
      data: Shop | null | undefined
      transformed: string | null | undefined
      awaited: number | null | undefined
      picked: Pick<Shop, 'shop'> | null | undefined
      error: NuxtError<unknown> | null | undefined
    }>()
  })

  it('types the customer account data by the operation and `transform`', () => {
    const results = () => ({
      data: useCustomerAccountData('query Customer', { variables: { first: 1 } }).data.value,
      transformed: useCustomerAccountData('key', 'query Customer', { transform: data => data.customer.id }).data.value,
    })

    expectTypeOf(results).returns.toEqualTypeOf<{
      data: { customer: { id: string } } | null | undefined
      transformed: string | null | undefined
    }>()
  })
})
