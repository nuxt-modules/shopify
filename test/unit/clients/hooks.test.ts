import { afterEach, describe, expect, it, vi } from 'vitest'

import { createClient } from '#src/runtime/utils/clients/create'
import { createStorefrontConfig } from '#src/runtime/utils/clients/storefront'

const definition = { kind: 'storefront', createConfig: createStorefrontConfig, cache: true } as never

const config = { name: 'shop', clients: { storefront: { apiVersion: '2026-04', publicAccessToken: 'tok', retries: 0 } } }

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
  it('never writes defaults back into the config it was given', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const shared = { name: 'shop', clients: { storefront: { publicAccessToken: 'tok' } } }
    const snapshot = structuredClone(shared)

    await createClient(definition, shared as never, {} as never).request(QUERY as never)

    expect(shared).toStrictEqual(snapshot)
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
      expect.objectContaining({ config: expect.objectContaining({ apiVersion: expect.any(String) }) }),
    )
  })

  it('leaves a sibling client untouched', async () => {
    respondWith({ data: { shop: { name: 'shop' } } })

    const shared = {
      name: 'shop',
      clients: {
        storefront: { publicAccessToken: 'tok' },
        admin: { accessToken: 'shpat_x' },
      },
    }
    const admin = shared.clients.admin

    await createClient(definition, shared as never, {} as never).request(QUERY as never)

    expect(shared.clients.admin).toBe(admin)
    expect(admin).toStrictEqual({ accessToken: 'shpat_x' })
  })
})
