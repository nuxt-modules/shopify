import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const request = vi.fn()
const createAdminApiClient = vi.fn((..._args: unknown[]) => ({ request }))

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('#src/runtime/utils/clients/admin', () => ({
  createAdminApiClient: (...args: unknown[]) => createAdminApiClient(...args as []),
}))

vi.stubGlobal('__NUXT_DEV__', true)

const handler = (await import('#src/runtime/server/api/admin/explorer')).default

const query = '{ shop { name } }'

const explorerEvent = (headers: Record<string, string> = {}, body: unknown = { query }) =>
  createTestEvent({ method: 'POST', path: '/_explorer/proxy/admin', headers: { host: 'localhost:3005', ...headers }, body })

beforeEach(() => {
  vi.clearAllMocks()

  vi.stubGlobal('__NUXT_DEV__', true)

  request.mockResolvedValue({ data: { shop: { name: 'Test Shop' } } })

  runtimeConfig._shopify = {
    name: 'test-shop',
    clients: { admin: { apiVersion: API_VERSION, clientId: 'id', clientSecret: 'secret' } },
  }
})

describe('availability', () => {
  it('does not answer outside of dev', async () => {
    vi.stubGlobal('__NUXT_DEV__', false)

    await expect(handler(explorerEvent())).resolves.toBeUndefined()
    expect(createAdminApiClient).not.toHaveBeenCalled()
  })
})

describe('request guarding', () => {
  it('answers requests from Nitro\'s dev worker, which sees no client address', async () => {
    await expect(handler(explorerEvent())).resolves.toEqual({ data: { shop: { name: 'Test Shop' } } })
  })

  it('rejects a cross-site request', async () => {
    await expect(handler(explorerEvent({ 'sec-fetch-site': 'cross-site' }))).rejects.toMatchObject({ statusCode: 403 })

    expect(createAdminApiClient).not.toHaveBeenCalled()
  })

  it('fails when the module configuration is missing', async () => {
    runtimeConfig._shopify = undefined

    await expect(handler(explorerEvent())).rejects.toMatchObject({ statusCode: 500 })
  })

  it('rejects a body without a query', async () => {
    await expect(handler(explorerEvent({}, { variables: {} }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('admin requests', () => {
  it('sends the query and variables through the admin client, which never throws so the explorer can render errors', async () => {
    await handler(explorerEvent({}, { query, variables: { first: 2 } }))

    expect(createAdminApiClient).toHaveBeenCalledWith(runtimeConfig._shopify, { throwOnErrors: false })
    expect(request).toHaveBeenCalledWith(query, { variables: { first: 2 } })
  })

  it('sends only the operation GraphiQL selected, with the fragments it uses, since the admin client sends no operation name', async () => {
    const document = 'query Shop { shop { ...ShopFields } } query Products { products(first: 1) { nodes { id } } } fragment ShopFields on Shop { name }'

    await handler(explorerEvent({}, { query: document, operationName: 'Shop' }))

    expect(request.mock.calls[0]![0]).not.toContain('Products')
    expect(request.mock.calls[0]![0]).toContain('query Shop')
    expect(request.mock.calls[0]![0]).toContain('fragment ShopFields on Shop')
  })

  it('sends the document as written when GraphiQL names no operation', async () => {
    await handler(explorerEvent({}, { query, operationName: null }))

    expect(request).toHaveBeenCalledWith(query, { variables: undefined })
  })
})

describe('response shape', () => {
  it('returns only the GraphQL payload', async () => {
    request.mockResolvedValue({ data: { shop: { name: 'Test Shop' } }, headers: new Headers({ 'x-request-id': 'abc' }) })

    await expect(handler(explorerEvent())).resolves.toStrictEqual({ data: { shop: { name: 'Test Shop' } } })
  })

  it('keeps extensions alongside the data', async () => {
    request.mockResolvedValue({ data: { shop: { name: 'Test Shop' } }, extensions: { cost: { requestedQueryCost: 1 } }, headers: new Headers() })

    await expect(handler(explorerEvent()))
      .resolves.toStrictEqual({ data: { shop: { name: 'Test Shop' } }, extensions: { cost: { requestedQueryCost: 1 } } })
  })

  it('renders graphql errors as an array', async () => {
    request.mockResolvedValue({ errors: { message: 'GraphQL error', graphQLErrors: [{ message: 'Field `nope` does not exist' }] }, headers: new Headers() })

    await expect(handler(explorerEvent())).resolves.toStrictEqual({ errors: [{ message: 'Field `nope` does not exist' }] })
  })

  it('falls back to the error message when there are no graphql errors', async () => {
    request.mockResolvedValue({ errors: { message: 'Network request failed' }, headers: new Headers() })

    await expect(handler(explorerEvent())).resolves.toStrictEqual({ errors: [{ message: 'Network request failed' }] })
  })
})
