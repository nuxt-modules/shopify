import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createError } from 'h3'

import { createAdminApiClient } from '#src/runtime/utils/clients/admin'
import { createCustomerAccountApiClient } from '#src/runtime/utils/clients/customer-account'
import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'
import { createStorefrontApiClient } from '#src/runtime/utils/clients/storefront'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { stubHangingFetch } from '#test/helpers/fetch'
import { createLogReporter } from '#test/helpers/logger'

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
  vi.useRealTimers()
})

describe('client response hook', () => {
  it('tells the hook how long the request took', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => setTimeout(() => resolve(Response.json({ data: { shop: { name: 'shop' } } })), 250))))

    const hooks = createHooks()

    const pending = createStorefrontApiClient(config, hooks).request(QUERY)

    await vi.advanceTimersByTimeAsync(250)
    await pending

    expect(hooks.onResponse).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ duration: 250 }))
  })

  it('fires for a successful response', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const hooks = createHooks()

    await createStorefrontApiClient(config, hooks).request(QUERY)

    expect(hooks.onResponse).toHaveBeenCalledTimes(1)
    expect(hooks.onErrors).not.toHaveBeenCalled()
  })

  it('fires for a failed response when errors do not throw', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const hooks = createHooks()

    const client = createStorefrontApiClient(config, { ...hooks, throwOnErrors: false })

    await client.request(QUERY)

    expect(hooks.onResponse).toHaveBeenCalledTimes(1)
    expect(hooks.onErrors).toHaveBeenCalledTimes(1)
  })

  it('stays quiet about a request its caller cancelled, as Nuxt does with superseded async data', async () => {
    stubHangingFetch()

    const hooks = createHooks()
    const controller = new AbortController()

    const pending = createStorefrontApiClient(config, hooks).request(QUERY, { signal: controller.signal })

    controller.abort()

    await expect(pending).resolves.toMatchObject({ errors: expect.anything() })
    expect(hooks.onResponse).not.toHaveBeenCalled()
    expect(hooks.onErrors).not.toHaveBeenCalled()
  })
})

describe('caller configuration', () => {
  it('applies the defaults to the client it builds, but never writes them back into the config it was given or its sibling clients', async () => {
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
    const onConfigure = vi.fn()

    await createStorefrontApiClient(shared, { onConfigure }).request(QUERY)

    expect(onConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ apiVersion: DEFAULT_API_VERSION }) }),
    )
    expect(shared).toStrictEqual(snapshot)
    expect(shared.clients.admin).toBe(admin)
    expect(shared.clients.storefront).not.toHaveProperty('apiVersion')
    expect(shared.clients.storefront).not.toHaveProperty('retries')
  })

  it.each([
    ['throws', false, true, 'rejected'],
    ['returns the errors', true, false, 'fulfilled'],
  ])('lets the caller\'s `throwOnErrors` win over the module\'s `errors.throw`, so a failed request %s', async (_, moduleThrows, throwOnErrors, status) => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const client = createStorefrontApiClient({ ...config, errors: { throw: moduleThrows }, logger: { reporters: [] } }, { throwOnErrors })

    await expect(Promise.allSettled([client.request(QUERY)])).resolves.toMatchObject([{ status }])
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

    const response = await createCustomerAccountApiClient(customerAccountConfig, { ...hooks, auth: signedOut, throwOnErrors: false })
      .request('query Customer { customer { id } }')

    expect(response.errors).toStrictEqual({ networkStatusCode: 401, message: '[shopify] No customer account session' })
    expect(hooks.onErrors).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws a failed authentication with its own status when errors throw, since it is not Shopify\'s answer', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const hooks = createHooks()

    await expect(createCustomerAccountApiClient(customerAccountConfig, { ...hooks, auth: signedOut, throwOnErrors: true })
      .request('query Customer { customer { id } }')).rejects.toMatchObject({ statusCode: 401, message: '[shopify] No customer account session' })

    expect(hooks.onErrors).toHaveBeenCalledWith({ errors: { networkStatusCode: 401, message: '[shopify] No customer account session' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('hides a failed admin token exchange from the visitor, in every kind of request, and logs it with the client\'s logger', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Invalid client_id admin-client-id', { status: 400 })))

    const { log, logger } = createLogReporter()

    const admin = createAdminApiClient(
      { name: 'shop', clients: { admin: { clientId: 'admin-client-id', clientSecret: 'secret' } } },
      { logger },
    )

    for (const request of [() => admin.request(QUERY), () => admin.fetch(QUERY), () => admin.requestStream(QUERY)]) {
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

  const CUSTOMER_QUERY = 'query Customer { customer { id } }'

  const signedIn = () => Promise.resolve('customer-access-token')

  const sentHeaders = () => (vi.mocked(fetch).mock.calls[0]![1] as RequestInit).headers as Record<string, string>

  it('authenticates a raw fetch like a request', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    await createCustomerAccountApiClient(customerAccountConfig, { auth: signedIn }).fetch(CUSTOMER_QUERY)

    expect(sentHeaders()).toMatchObject({ Authorization: 'customer-access-token' })
  })

  it('authenticates a streamed request like a request', async () => {
    respondWith({ data: { customer: { id: '1' } } })

    const stream = await createCustomerAccountApiClient(customerAccountConfig, { auth: signedIn })
      .requestStream('query Customer { customer { id ... @defer { emailAddress { emailAddress } } } }')

    for await (const chunk of stream) expect(chunk.data).toEqual({ customer: { id: '1' } })

    expect(sentHeaders()).toMatchObject({ Authorization: 'customer-access-token' })
  })
})

describe('client logging', () => {
  it('logs Shopify\'s errors with the logger of the module config', async () => {
    respondWith({ errors: [{ message: 'Field `nope` doesn\'t exist' }] })

    const { log, logger } = createLogReporter()

    await expect(createStorefrontApiClient({ ...config, logger }).request(QUERY)).rejects.toMatchObject({ statusCode: 502 })

    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', args: ['GraphQL error: Field `nope` doesn\'t exist'] }), expect.anything())
  })

  it('keeps the request headers, and the tokens in them, out of the trace logs', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const { log, logger } = createLogReporter()

    const loggedConfig = {
      name: 'shop',
      logger: { ...logger, level: 5 },
      clients: { storefront: { apiVersion: API_VERSION, privateAccessToken: 'private-token' } },
    }

    await createStorefrontApiClient(loggedConfig).request(QUERY)

    const logged = JSON.stringify(log.mock.calls.map(([entry]) => entry.args))

    expect(logged).toContain(`https://shop.myshopify.com/api/${API_VERSION}/graphql.json`)
    expect(logged).not.toContain('private-token')
  })
})

describe('Shopify deprecation warnings', () => {
  const DEPRECATION_REASON = 'https://shopify.dev/api/usage/versioning#deprecation-practices'

  afterEach(() => {
    Reflect.deleteProperty(globalThis, Symbol.for('nuxt-shopify:warned-deprecations'))
  })

  function respondWithHeaders(headers: Record<string, string>, body: unknown = { data: { shop: { name: 'shop' } } }, status = 200) {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status, headers })))
  }

  function warnings(log: ReturnType<typeof createLogReporter>['log']) {
    return log.mock.calls.map(([entry]) => entry).filter(entry => entry.type === 'warn').map(entry => entry.args.join(' '))
  }

  it('warns once in development when Shopify serves another API version, as it does for a version it no longer supports', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION })

    const { log, logger } = createLogReporter()
    const client = createStorefrontApiClient({ ...config, logger })

    await client.request(QUERY)
    await client.request(QUERY)
    await client.request(QUERY)

    expect(warnings(log)).toStrictEqual([`The storefront client asked for API version \`${API_VERSION}\`, but Shopify no longer supports it and served \`${OTHER_API_VERSION}\` instead`])
  })

  it('warns once even when the server and the app each load their own copy of the client, as they do in development', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION })

    const { log, logger } = createLogReporter()

    vi.resetModules()

    const server = await import('#src/runtime/utils/clients/storefront')

    vi.resetModules()

    const app = await import('#src/runtime/utils/clients/storefront')

    expect(app.createStorefrontApiClient).not.toBe(server.createStorefrontApiClient)

    await server.createStorefrontApiClient({ ...config, logger }).request(QUERY)
    await app.createStorefrontApiClient({ ...config, logger }).request(QUERY)

    expect(warnings(log)).toHaveLength(1)
  })

  it('compares the served version with the one that the request or the client asked for', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION })

    const { log, logger } = createLogReporter()

    await createStorefrontApiClient({ ...config, logger }).request(QUERY, { apiVersion: OTHER_API_VERSION })
    await createStorefrontApiClient({ ...config, logger }, { apiVersion: OTHER_API_VERSION }).request(QUERY)

    expect(warnings(log)).toStrictEqual([])
  })

  it('names the customer account and admin clients like the warning at startup does', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION })

    const { log, logger } = createLogReporter()

    await createCustomerAccountApiClient({ name: 'shop', shopId: '1', logger, clients: { customerAccount: { apiVersion: API_VERSION, clientId: 'cid' } } }).request('query Customer { customer { id } }')
    await createAdminApiClient({ name: 'shop', logger, clients: { admin: { apiVersion: API_VERSION, accessToken: 'shpat_x' } } }).request(QUERY)

    expect(warnings(log)).toStrictEqual([
      `The customer-account client asked for API version \`${API_VERSION}\`, but Shopify no longer supports it and served \`${OTHER_API_VERSION}\` instead`,
      `The admin client asked for API version \`${API_VERSION}\`, but Shopify no longer supports it and served \`${OTHER_API_VERSION}\` instead`,
    ])
  })

  it('warns once per operation that Shopify flags for using deprecated API features', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-deprecated-reason': DEPRECATION_REASON })

    const { log, logger } = createLogReporter()
    const client = createStorefrontApiClient({ ...config, logger })

    await client.request(QUERY)
    await client.request(QUERY)
    await client.request('query Product { productByHandle(handle: "shirt") { id } }')

    expect(warnings(log)).toStrictEqual([
      `Shopify flagged the storefront operation \`Shop\` for using deprecated API features. See ${DEPRECATION_REASON}`,
      `Shopify flagged the storefront operation \`Product\` for using deprecated API features. See ${DEPRECATION_REASON}`,
    ])
  })

  it('reads the headers of a failed response from its raw response, and warns before the request fails', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-shopify-api-deprecated-reason': DEPRECATION_REASON }, { errors: [{ message: 'Access denied' }] }, 403)

    const { log, logger } = createLogReporter()

    await expect(createStorefrontApiClient({ ...config, logger }).request(QUERY)).rejects.toMatchObject({ statusCode: 403 })

    expect(warnings(log)).toStrictEqual([`Shopify flagged the storefront operation \`Shop\` for using deprecated API features. See ${DEPRECATION_REASON}`])
  })

  it('warns only on the server, since the browser\'s console reaches the dev terminal too', async () => {
    vi.stubGlobal('__NUXT_DEV__', true)
    vi.stubGlobal('__NUXT_CLIENT__', true)
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION, 'x-shopify-api-deprecated-reason': DEPRECATION_REASON })

    const { log, logger } = createLogReporter()

    await createStorefrontApiClient({ ...config, logger }).request(QUERY)

    expect(warnings(log)).toStrictEqual([])
  })

  it('stays quiet outside development, and about responses without these headers, such as mock.shop\'s', async () => {
    respondWithHeaders({ 'x-shopify-api-version': OTHER_API_VERSION, 'x-shopify-api-deprecated-reason': DEPRECATION_REASON })

    const { log, logger } = createLogReporter()

    await createStorefrontApiClient({ ...config, logger }).request(QUERY)

    vi.stubGlobal('__NUXT_DEV__', true)
    respondWithHeaders({ 'x-request-id': 'request-1' })

    await createStorefrontApiClient({ ...config, logger }).request(QUERY)

    expect(warnings(log)).toStrictEqual([])
  })
})
