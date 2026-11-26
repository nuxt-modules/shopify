import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

type ConfigureHook = (params: { config: { headers: Record<string, string> } }) => unknown

const registered = new Map<string, ConfigureHook[]>()

const hooks = {
  hook: (name: string, hook: ConfigureHook) => registered.set(name, [...registered.get(name) ?? [], hook]),
  callHook: (name: string, ...args: Parameters<ConfigureHook>) =>
    (registered.get(name) ?? []).reduce<Promise<unknown>>((promise, hook) => promise.then(() => hook(...args)), Promise.resolve()),
  callHookWith: (caller: (hooks: ConfigureHook[], args: Parameters<ConfigureHook>) => unknown, name: string, ...args: Parameters<ConfigureHook>) =>
    caller([...registered.get(name) ?? []], args),
}

// Nitro v3's hooks have no `callHookWith`, and `callHook` runs synchronous hooks right away
const nitroV3Hooks = {
  hook: hooks.hook,
  callHook: (name: string, ...args: Parameters<ConfigureHook>) => {
    for (const hook of registered.get(name) ?? []) hook(...args)
  },
}

let nitroHooks: typeof hooks | typeof nitroV3Hooks = hooks

const runtimeConfig = {
  _shopify: {
    name: 'my-shop',
    shopId: '1',
    clients: {
      storefront: { apiVersion: API_VERSION, publicAccessToken: 'public-token' },
      admin: { apiVersion: API_VERSION, accessToken: 'admin-token' },
      customerAccount: { apiVersion: API_VERSION, clientId: 'cid' },
    },
  },
}

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => runtimeConfig,
  useEvent: () => undefined,
  useNitroApp: () => ({ hooks: nitroHooks }),
}))

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

const { useStorefront } = await import('#src/runtime/server/utils/storefront/client')
const { useAdmin } = await import('#src/runtime/server/utils/admin/client')
const { useCustomerAccount } = await import('#src/runtime/server/utils/customer-account/client')

describe('client configure hooks in Nitro', () => {
  it.each([
    ['storefront', useStorefront],
    ['admin', useAdmin],
    ['customer-account', useCustomerAccount],
  ])('let a Nitro plugin change the %s client\'s config, although Nitro calls hooks asynchronously', (name, useClient) => {
    hooks.hook(`shopify:${name}:client:configure`, ({ config }) => {
      config.headers['X-Request-Source'] = 'nuxt-shopify'
    })

    expect(useClient(createTestEvent()).getHeaders()['X-Request-Source']).toBe('nuxt-shopify')
  })

  it.each([
    ['storefront', useStorefront],
    ['admin', useAdmin],
    ['customer-account', useCustomerAccount],
  ])('let a Nitro v3 plugin change the %s client\'s config, without `callHookWith`', (name, useClient) => {
    nitroHooks = nitroV3Hooks

    nitroHooks.hook(`shopify:${name}:client:configure`, ({ config }) => {
      config.headers['X-Nitro'] = 'v3'
    })

    expect(useClient(createTestEvent()).getHeaders()['X-Nitro']).toBe('v3')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()

  nitroHooks = hooks

  runtimeConfig._shopify.clients.admin = { apiVersion: API_VERSION, accessToken: 'admin-token' }
})

describe('client hooks in Nitro', () => {
  it.each([
    ['storefront', useStorefront],
    ['admin', useAdmin],
    ['customer-account', useCustomerAccount],
  ])('call every %s client hook under its shopify: name', async (name, useClient) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ errors: [{ message: 'Field not found' }] })))

    const called: string[] = []

    for (const step of ['create', 'request', 'response', 'errors']) {
      hooks.hook(`shopify:${name}:client:${step}`, () => void called.push(step))
    }

    await useClient(createTestEvent()).request('query Shop { shop { name } }').catch(() => undefined)

    expect(called).toEqual(['create', 'request', 'response', 'errors'])
  })

  it.each([
    ['success', 200, ['request', 'success']],
    ['error', 401, ['request', 'error']],
  ] as const)('call the admin token hooks under their shopify: names, on %s', async (outcome, status, expected) => {
    runtimeConfig._shopify.clients.admin = { apiVersion: API_VERSION, clientId: `client-${outcome}`, clientSecret: 'secret' } as never

    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/admin/oauth/access_token')
      ? Response.json({ access_token: 'token', expires_in: 3600 }, { status })
      : Response.json({ data: { shop: { name: 'Shop' } } })))

    const called: string[] = []

    for (const step of ['request', 'success', 'refresh', 'error']) {
      hooks.hook(`shopify:admin:auth:${step}`, () => void called.push(step))
    }

    await useAdmin(createTestEvent()).request('query Shop { shop { name } }').catch(() => undefined)

    expect(called).toEqual(expected)
  })
})
