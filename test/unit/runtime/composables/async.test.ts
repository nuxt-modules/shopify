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

type Request = { variables?: Record<string, unknown>, headers?: unknown, cache?: unknown, signal?: AbortSignal }

const storefrontRequests: Request[] = []
const customerAccountRequests: Request[] = []

const recordRequest = (requests: Request[]) => (_operation: string, { variables, headers, cache, signal }: Request) => {
  requests.push({ variables: structuredClone(variables), headers, cache, signal })

  return Promise.resolve({ data: {} })
}

vi.mock('#app', () => ({
  createError: (error: unknown) => new Error(JSON.stringify(error)),
  useAsyncData: (...args: unknown[]) => {
    const handler = (typeof args[0] === 'function' ? args[0] : args[1]) as (nuxtApp: unknown, context: { signal: AbortSignal }) => Promise<unknown>

    return { key: args[0], refresh: (signal = new AbortController().signal) => handler({}, { signal }) }
  },
}))

vi.mock('#src/runtime/composables/storefront/client.ts', () => ({
  useStorefront: () => ({ request: recordRequest(storefrontRequests) }),
}))

vi.mock('#src/runtime/composables/customer-account/client.ts', () => ({
  useCustomerAccount: () => ({ request: recordRequest(customerAccountRequests) }),
}))

const { useStorefrontData } = await import('#src/runtime/composables/storefront/async')
const { useCustomerAccountData } = await import('#src/runtime/composables/customer-account/async')

type Refreshable = { key: unknown, refresh: (signal?: AbortSignal) => Promise<unknown> }
type UseData = (...args: unknown[]) => Refreshable

const clients = [
  { name: 'storefront', composable: 'useStorefrontData', useData: useStorefrontData as unknown as UseData, requests: storefrontRequests },
  { name: 'customer account', composable: 'useCustomerAccountData', useData: useCustomerAccountData as unknown as UseData, requests: customerAccountRequests },
]

beforeEach(() => {
  storefrontRequests.length = 0
  customerAccountRequests.length = 0
})

describe('async data arguments', () => {
  it.each(clients)('names $composable when it gets no arguments', ({ composable, useData }) => {
    expect(() => useData()).toThrow(`\`${composable}\``)
  })

  it.each(clients)('names $composable when it gets too many arguments', ({ composable, useData }) => {
    expect(() => useData('key', 'query { shop { name } }', {}, 'auto', 'extra')).toThrow(`\`${composable}\``)
  })
})

describe('async data variables', () => {
  it.each(clients)('re-reads $name ref variables on every request', async ({ useData, requests }) => {
    const handle = ref('first')

    const { refresh } = useData('key', 'query', { variables: { handle } })

    await refresh()
    handle.value = 'second'
    await refresh()

    expect(requests.map(request => request.variables)).toStrictEqual([{ handle: 'first' }, { handle: 'second' }])
  })
})

describe('async data requests', () => {
  it.each(clients)('reads the options of a $name call without a key, even when the compiler added none', async ({ useData, requests }) => {
    const { refresh } = useData('query { shop { name } }', { variables: { first: 1 } })

    await refresh()

    expect(requests.map(request => request.variables)).toStrictEqual([{ first: 1 }])
  })

  it.each(clients)('re-reads $name ref headers on every request', async ({ useData, requests }) => {
    const headers = ref({ 'x-test': 'first' })

    const { refresh } = useData('key', 'query { shop { name } }', { headers })

    await refresh()
    headers.value = { 'x-test': 'second' }
    await refresh()

    expect(requests.map(request => request.headers)).toStrictEqual([{ 'x-test': 'first' }, { 'x-test': 'second' }])
  })

  it('re-reads the storefront ref cache option on every request', async () => {
    const cache = ref('short')

    const { refresh } = useStorefrontData('key', 'query { shop { name } }' as never, { cache } as never) as unknown as Refreshable

    await refresh()
    cache.value = 'long'
    await refresh()

    expect(storefrontRequests.map(request => request.cache)).toStrictEqual(['short', 'long'])
  })

  it.each(clients)('lets Nuxt cancel a $name request it no longer needs', async ({ useData, requests }) => {
    const controller = new AbortController()
    const { refresh } = useData('key', 'query { shop { name } }')

    await refresh(controller.signal)

    expect(requests.map(request => request.signal)).toStrictEqual([controller.signal])
  })

  it.each(clients)('keeps the caller\'s own signal over Nuxt\'s for $name requests', async ({ useData, requests }) => {
    const own = new AbortController().signal
    const { refresh } = useData('key', 'query { shop { name } }', { signal: own })

    await refresh(new AbortController().signal)

    expect(requests.map(request => request.signal)).toStrictEqual([own])
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
