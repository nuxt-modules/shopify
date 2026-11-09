import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolver } from '#test/helpers/nuxt'

const addPlugin = vi.fn()
const addServerHandler = vi.fn()

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<typeof import('@nuxt/kit')>(),
  addImports: vi.fn(),
  addPlugin,
  addServerHandler,
  addServerImports: vi.fn(),
  addServerPlugin: vi.fn(),
  extendRouteRules: vi.fn(),
}))

const { default: setupStorefrontClient } = await import('#src/setup/clients/storefront')

function setup(storefront: Record<string, unknown>) {
  const hooks = new Map<string, (...args: never[]) => unknown>()

  const nuxt = {
    options: { nitro: {} as { storage?: Record<string, unknown> }, dev: false, imports: {}, optimization: { keyedComposables: [] }, serverHandlers: [] },
    hook: (name: string, hook: (...args: never[]) => unknown) => hooks.set(name, hook),
  }

  const config = { name: 'shop', clients: { storefront } }

  setupStorefrontClient(nuxt as never, config as never, resolver)

  return {
    storage: nuxt.options.nitro.storage,
    initNitro: (preset: string) => {
      const runtimeConfig = { shopify: structuredClone(config), _shopify: structuredClone(config) }

      hooks.get('nitro:init')!({ options: { preset, runtimeConfig } } as never)

      return runtimeConfig
    },
  }
}

describe('setupStorefrontClient', () => {
  it('reads the buyer ip from the header the deployment platform sets', () => {
    const runtimeConfig = setup({ privateAccessToken: 'private' }).initNitro('vercel')

    expect(runtimeConfig.shopify.clients.storefront).toMatchObject({ buyerIpHeader: 'x-real-ip' })
    expect(runtimeConfig._shopify.clients.storefront).toMatchObject({ buyerIpHeader: 'x-real-ip' })
  })

  it('keeps a configured buyer ip header', () => {
    const runtimeConfig = setup({ privateAccessToken: 'private', buyerIpHeader: 'x-client-ip' }).initNitro('vercel')

    expect(runtimeConfig.shopify.clients.storefront).toMatchObject({ buyerIpHeader: 'x-client-ip' })
  })

  it('leaves the buyer ip to the socket address on an unknown platform', () => {
    const runtimeConfig = setup({ privateAccessToken: 'private' }).initNitro('node-server')

    expect(runtimeConfig.shopify.clients.storefront).not.toHaveProperty('buyerIpHeader')
  })
})

describe('storefront routes', () => {
  beforeEach(() => {
    addServerHandler.mockClear()
  })

  it.each([
    ['a public client', { publicAccessToken: 'public' }],
    ['a server-only client', { privateAccessToken: 'private' }],
  ])('serves Hydrogen\'s cart and Storefront API routes for %s', (_, storefront) => {
    setup(storefront)

    expect(addServerHandler).toHaveBeenCalledWith({ middleware: true, handler: './runtime/server/middleware/routes' })
  })
})

describe('storefront cache', () => {
  const cache = { browser: { ttl: 1000 }, server: { driver: 'redis' }, presets: {} }

  const BROWSER_CACHE_PLUGIN = { src: './runtime/plugins/storefront/cache', mode: 'client' }

  beforeEach(() => {
    addPlugin.mockClear()
    addServerHandler.mockClear()
  })

  it('sets up the browser cache and the server cache storage of a public client', () => {
    const { storage } = setup({ publicAccessToken: 'public', cache })

    expect(addPlugin).toHaveBeenCalledWith(BROWSER_CACHE_PLUGIN)
    expect(storage).toStrictEqual({ 'storefront-cache': cache.server })
  })

  it.each([
    ['without a server cache', { publicAccessToken: 'public', cache: { server: false } }],
    ['without any cache', { publicAccessToken: 'public', cache: false }],
  ])('mounts no server cache storage %s', (_, storefront) => {
    const { storage } = setup(storefront)

    expect(storage).toBeUndefined()
  })

  it('sets up no cache for a server-only client, which has no browser client to cache for', () => {
    const { storage } = setup({ privateAccessToken: 'private', cache })

    expect(addPlugin).not.toHaveBeenCalledWith(BROWSER_CACHE_PLUGIN)
    expect(storage).toBeUndefined()
  })

  it('registers no middleware of its own for the server cache, which the routes middleware hands to server rendering', () => {
    setup({ publicAccessToken: 'public', cache })

    expect(addServerHandler).toHaveBeenCalledOnce()
    expect(addServerHandler).toHaveBeenCalledWith({ middleware: true, handler: './runtime/server/middleware/routes' })
  })
})
