import { resolveModulePath } from 'exsolve'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'

type Hooks = {
  hook: (name: string, hook: (params: { config: { headers: Record<string, string> } }) => void) => void
  callHook: (name: string, ...args: unknown[]) => Promise<unknown>
  removeAllHooks: () => void
}

const loadHookable = async (from: string) => (await import(resolveModulePath('hookable', { from: resolveModulePath(from, { from: import.meta.url }) }))).createHooks as () => Hooks

const hookables = [
  ['hookable 6, as in Nuxt 4.4 and newer', await loadHookable('nuxt')],
  ['hookable 5, as in Nuxt 3 and Nuxt 4.0 to 4.3', await loadHookable('nitropack')],
] as const

let hooks: Hooks

const config = {
  name: 'shop',
  shopId: '1',
  clients: {
    storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', proxy: true, cache: false },
    customerAccount: { apiVersion: API_VERSION, clientId: 'client', proxy: true },
  },
}

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ app: { baseURL: '/' }, public: { _shopify: config } }),
  useNuxtApp: () => ({ payload: {}, hooks }),
  useRequestURL: () => new URL('https://shop.test/'),
  useRequestEvent: () => undefined,
}))

const { useStorefront } = await import('#src/runtime/composables/storefront/client')
const { useCustomerAccount } = await import('#src/runtime/composables/customer-account/client')

function createNuxtHooks(createHooks: () => Hooks): Hooks {
  const created = createHooks()

  const callHook = created.callHook.bind(created)

  created.callHook = (name: string, ...args: unknown[]) => Promise.resolve().then(() => callHook(name, ...args))

  return created
}

afterEach(() => {
  hooks?.removeAllHooks()

  vi.unstubAllGlobals()
})

describe.each(hookables)('configure hooks in the app, with %s', (_, createHooks) => {
  it.each([
    ['storefront', 'shopify:storefront:client:configure', () => useStorefront()],
    ['customer account', 'shopify:customer-account:client:configure', () => useCustomerAccount()],
  ] as const)('apply every %s hook before the client copies its config, although Nuxt defers callHook', (_, name, use) => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    hooks = createNuxtHooks(createHooks)

    hooks.hook(name, ({ config }) => {
      config.headers['X-First'] = '1'
    })

    hooks.hook(name, ({ config }) => {
      config.headers['X-Second'] = '2'
    })

    expect(use().config.headers).toMatchObject({ 'X-First': '1', 'X-Second': '2' })
  })
})

describe('client hooks in the app', () => {
  it.each([
    ['storefront', () => useStorefront()],
    ['customer-account', () => useCustomerAccount()],
  ] as const)('call every %s client hook under its shopify: name', async (name, use) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ errors: [{ message: 'Field not found' }] })))

    hooks = createNuxtHooks(hookables[0][1])

    const called: string[] = []

    for (const step of ['create', 'request', 'response', 'errors']) {
      hooks.hook(`shopify:${name}:client:${step}`, () => void called.push(step))
    }

    await use().request('query Shop { shop { name } }').catch(() => undefined)

    expect(called).toEqual(['create', 'request', 'response', 'errors'])
  })
})
