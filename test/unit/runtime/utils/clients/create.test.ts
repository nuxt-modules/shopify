import type { createStorefrontApiClient } from '#src/runtime/utils/clients/storefront'

import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createError } from 'h3'

import { createAdminApiClient } from '#src/runtime/utils/clients/admin'
import { createClient } from '#src/runtime/utils/clients/create'
import { createCustomerAccountApiClient } from '#src/runtime/utils/clients/customer-account'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { createStorefrontConfig } from '#src/runtime/utils/clients/storefront'
import { API_VERSION } from '#test/helpers/api-version'

const definition = { kind: 'storefront', createConfig: createStorefrontConfig, cachePresets: () => undefined } as never

const config = { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'tok' } } }

const QUERY = 'query Shop { shop { name } }'

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify(body),
    { status, headers: { 'content-type': 'application/json' } },
  )))
}

function createHooks() {
  return { onRequest: vi.fn(), onResponse: vi.fn(), onErrors: vi.fn() }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('client response hook', () => {
  it('fires for a successful response', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const hooks = createHooks()

    await createClient(definition, config as never, hooks as never).request(QUERY as never)

    expect(hooks.onResponse).toHaveBeenCalledTimes(1)
    expect(hooks.onErrors).not.toHaveBeenCalled()
  })

  it('fires for a failed response even when errors throw', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const hooks = createHooks()

    const client = createClient(definition, config as never, hooks as never)

    await expect(client.request(QUERY as never)).rejects.toMatchObject({ statusCode: expect.any(Number) })

    expect(hooks.onResponse).toHaveBeenCalledTimes(1)
    expect(hooks.onErrors).toHaveBeenCalledTimes(1)
  })

  it('fires for a failed response when errors do not throw', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const hooks = createHooks()

    const client = createClient(definition, config as never, { ...hooks, throwOnErrors: false } as never)

    await client.request(QUERY as never)

    expect(hooks.onResponse).toHaveBeenCalledTimes(1)
    expect(hooks.onErrors).toHaveBeenCalledTimes(1)
  })

  it('stays quiet about a request its caller cancelled, as Nuxt does with superseded async data', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException('This operation was aborted', 'AbortError'))

      if (init.signal?.aborted) abort()
      else init.signal?.addEventListener('abort', abort)
    })))

    const hooks = createHooks()
    const controller = new AbortController()

    const pending = createClient(definition, config as never, hooks as never).request(QUERY as never, { signal: controller.signal } as never)

    controller.abort()

    await expect(pending).resolves.toMatchObject({ errors: expect.anything() })
    expect(hooks.onResponse).not.toHaveBeenCalled()
    expect(hooks.onErrors).not.toHaveBeenCalled()
  })

  it('hands the response to the hook before the errors are thrown', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const order: string[] = []

    const client = createClient(definition, config as never, {
      onResponse: () => void order.push('response'),
      onErrors: () => void order.push('errors'),
    } as never)

    await client.request(QUERY as never).catch(() => {})

    expect(order).toStrictEqual(['response', 'errors'])
  })
})

describe('caller configuration', () => {
  it('never writes defaults back into the config it was given or its sibling clients', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const shared = {
      name: 'shop',
      clients: {
        storefront: { publicAccessToken: 'tok' },
        admin: { accessToken: 'shpat_x' },
      },
    }
    const snapshot = structuredClone(shared)
    const admin = shared.clients.admin

    await createClient(definition, shared as never, {} as never).request(QUERY as never)

    expect(shared).toStrictEqual(snapshot)
    expect(shared.clients.admin).toBe(admin)
    expect(shared.clients.storefront).not.toHaveProperty('apiVersion')
    expect(shared.clients.storefront).not.toHaveProperty('retries')
  })

  it('still applies the defaults to the client it builds', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const onConfigure = vi.fn()

    await createClient(
      definition,
      { name: 'shop', clients: { storefront: { publicAccessToken: 'tok' } } } as never,
      { onConfigure } as never,
    ).request(QUERY as never)

    expect(onConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ apiVersion: DEFAULT_API_VERSION }) }),
    )
  })
})

describe('client authentication', () => {
  const customerAccountConfig = {
    name: 'shop',
    shopId: '1',
    clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid' } },
  }

  const signedOut = () => Promise.reject(createError({ status: 401, statusText: 'Unauthorized', message: '[shopify] No customer account session' }))

  it('returns a failed authentication as the request\'s errors when errors don\'t throw', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const hooks = createHooks()

    const response = await createCustomerAccountApiClient(customerAccountConfig as never, { ...hooks, auth: signedOut, throwOnErrors: false })
      .request('query Customer { customer { id } }' as never)

    expect(response.errors).toStrictEqual({ networkStatusCode: 401, message: 'No customer account session' })
    expect(hooks.onErrors).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws a failed authentication with its own status when errors throw, since it is not Shopify\'s answer', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const hooks = createHooks()

    await expect(createCustomerAccountApiClient(customerAccountConfig as never, { ...hooks, auth: signedOut, throwOnErrors: true })
      .request('query Customer { customer { id } }' as never)).rejects.toMatchObject({ statusCode: 401, message: '[shopify] No customer account session' })

    expect(hooks.onErrors).toHaveBeenCalledWith({ errors: { networkStatusCode: 401, message: 'No customer account session' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('hides a failed admin token exchange from the visitor, in every kind of request, and logs it with the client\'s logger', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Invalid client_id admin-client-id', { status: 400 })))

    const log = vi.fn()

    const admin = createAdminApiClient(
      { name: 'shop', clients: { admin: { clientId: 'admin-client-id', clientSecret: 'secret' } } },
      { logger: { reporters: [{ log }] } },
    )

    for (const request of [() => admin.request(QUERY as never), () => admin.fetch(QUERY as never), () => admin.requestStream(QUERY as never)]) {
      const error = await request().catch(error => error)

      expect(error).toMatchObject({ statusCode: 502, message: '[shopify] Request to Shopify failed' })
      expect(JSON.stringify(error)).not.toContain('admin-client-id')
    }

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: ['Failed to obtain an Admin API access token: HTTP 400 - Invalid client_id admin-client-id'] }),
      expect.anything(),
    )
  })

  it('offers the admin token callbacks only on the admin client, the only one that exchanges tokens', () => {
    expectTypeOf<NonNullable<Parameters<typeof createAdminApiClient>[1]>>().toHaveProperty('onAuthToken')
    expectTypeOf<NonNullable<Parameters<typeof createStorefrontApiClient>[1]>>().not.toHaveProperty('onAuthToken')
    expectTypeOf<NonNullable<Parameters<typeof createCustomerAccountApiClient>[1]>>().not.toHaveProperty('onAuthToken')
  })
})

describe('raw client requests', () => {
  const customerAccountConfig = {
    name: 'shop',
    shopId: '1',
    clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid' } },
  }

  const CUSTOMER_QUERY = 'query Customer { customer { id } }' as never

  const signedIn = () => Promise.resolve('customer-access-token')

  const sentHeaders = () => (vi.mocked(fetch).mock.calls[0]![1] as RequestInit).headers as Record<string, string>

  it('authenticates a raw fetch like a request', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    await createCustomerAccountApiClient(customerAccountConfig as never, { auth: signedIn }).fetch(CUSTOMER_QUERY)

    expect(sentHeaders()).toMatchObject({ Authorization: 'customer-access-token' })
  })

  it('authenticates a streamed request like a request', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const stream = await createCustomerAccountApiClient(customerAccountConfig as never, { auth: signedIn })
      .requestStream('query Customer { customer { id ... @defer { emailAddress { emailAddress } } } }' as never)

    for await (const chunk of stream) expect(chunk.data).toEqual({ customer: { id: '1' } })

    expect(sentHeaders()).toMatchObject({ Authorization: 'customer-access-token' })
  })

  it('rejects a raw fetch that cannot authenticate, without sending it', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const signedOut = () => Promise.reject(createError({ status: 401, statusText: 'Unauthorized', message: '[shopify] No customer account session' }))

    await expect(createCustomerAccountApiClient(customerAccountConfig as never, { auth: signedOut }).fetch(CUSTOMER_QUERY)).rejects.toMatchObject({ statusCode: 401 })

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('client logging', () => {
  it('logs Shopify\'s errors with the logger of the module config', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const log = vi.fn()

    await expect(createClient(definition, { ...config, logger: { reporters: [{ log }] } } as never).request(QUERY as never)).rejects.toMatchObject({ statusCode: 502 })

    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', args: ['GraphQL error: Field `nope` doesn\'t exist'] }), expect.anything())
  })

  it('keeps the request headers, and the tokens in them, out of the trace logs', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const logs: unknown[] = []

    const loggedConfig = {
      name: 'shop',
      logger: { level: 5, reporters: [{ log: (entry: { args: unknown[] }) => void logs.push(entry.args) }] },
      clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private-token' } },
    }

    await createClient(definition, loggedConfig as never).request(QUERY as never)

    const logged = JSON.stringify(logs)

    expect(logged).toContain(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
    expect(logged).not.toContain('private-token')
  })
})
