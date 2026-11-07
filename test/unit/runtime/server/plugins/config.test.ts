import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'

type ResolvedShopify = { name?: string, shopId?: string, clients?: { storefront?: { publicAccessToken?: string } } }

type RuntimeConfig = {
  shopify?: unknown
  public?: { shopify?: unknown, _shopify?: ResolvedShopify }
  _shopify?: ResolvedShopify
}

let base: RuntimeConfig = {}
let hooks: Record<string, (event: object) => Promise<void>> = {}

const eventConfigs = new Map<object, RuntimeConfig>()

const warn = vi.fn()

const { configureLogging } = vi.hoisted(() => ({ configureLogging: vi.fn() }))

const hydrogenLogger = { tag: 'hydrogen' }

vi.mock('@shopify/hydrogen', async () => ({ ...await vi.importActual<object>('@shopify/hydrogen'), configureLogging }))

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: (event?: object) => {
    if (!event) return base

    if (!eventConfigs.has(event)) eventConfigs.set(event, structuredClone(base))

    return eventConfigs.get(event)
  },
}))

vi.mock('#src/runtime/server/utils/log', () => ({ createLogger: () => ({ warn, withTag: () => hydrogenLogger }) }))

const plugin = (await import('#src/runtime/server/plugins/config')).default as unknown as (nitroApp: unknown) => void

async function requestConfig() {
  plugin({ hooks: { hook: (name: string, hook: (event: object) => Promise<void>) => void (hooks[name] = hook) } })

  const event = {}

  await hooks.request?.(event)

  return eventConfigs.get(event) ?? base
}

beforeEach(() => {
  base = {}
  hooks = {}

  eventConfigs.clear()
  warn.mockClear()
  configureLogging.mockClear()
})

describe('logging', () => {
  it('sends Hydrogen\'s logs through the module\'s logger when one is configured', async () => {
    base = { public: {}, _shopify: { logger: { level: 4 } } as never }

    await requestConfig()

    expect(configureLogging).toHaveBeenCalledExactlyOnceWith({ logger: hydrogenLogger, level: 'trace' })
  })

  it('leaves Hydrogen\'s own console logging alone without a configured logger', async () => {
    base = { public: {}, _shopify: {} }

    await requestConfig()

    expect(configureLogging).not.toHaveBeenCalled()
  })
})

describe('runtime config plugin', () => {
  it('lets public runtime values win over private ones, as the build does', async () => {
    base = {
      shopify: { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'private-token' } } },
      public: { shopify: { clients: { storefront: { publicAccessToken: 'public-token' } } } },
      _shopify: {},
    }

    const config = await requestConfig()

    expect(config._shopify?.clients?.storefront?.publicAccessToken).toBe('public-token')
    expect(config.public?._shopify?.clients?.storefront?.publicAccessToken).toBe('public-token')
  })

  it('keeps the build\'s value of an invalid runtime feature, and every other runtime override', async () => {
    const builtCustomerAccount = { clientId: 'built-client' }

    base = {
      shopify: {
        name: 'shop',
        shopId: '1',
        clients: {
          storefront: { apiVersion: API_VERSION, publicAccessToken: 'rotated-token' },
          customerAccount: { ...builtCustomerAccount, clientId: '' },
        },
      },
      public: {},
      _shopify: { name: 'shop', shopId: '1', clients: { storefront: { publicAccessToken: 'built-token' }, customerAccount: builtCustomerAccount } as never },
    }

    const config = await requestConfig()

    expect(config._shopify?.clients?.storefront?.publicAccessToken).toBe('rotated-token')
    expect(config._shopify?.clients).toHaveProperty('customerAccount.clientId', 'built-client')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`clients.customerAccount`'))
  })

  it('keeps the build\'s API version when the runtime environment sets an empty one, and the client\'s other runtime values', async () => {
    const freeze = (value: object): object => Object.freeze(Object.values(value).forEach(nested => nested && typeof nested === 'object' && freeze(nested)) ?? value)

    base = freeze({
      shopify: { name: 'shop', clients: { storefront: { apiVersion: '', publicAccessToken: 'rotated-token' } } },
      public: {},
      _shopify: { name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'token' } } as never },
    }) as RuntimeConfig

    const config = await requestConfig()

    expect(config._shopify?.clients).toHaveProperty('storefront.apiVersion', API_VERSION)
    expect(config._shopify?.clients).toHaveProperty('storefront.publicAccessToken', 'rotated-token')
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps the built config and warns when the runtime config is invalid', async () => {
    base = {
      shopify: { name: '' },
      public: {},
      _shopify: { name: 'built' },
    }

    const config = await requestConfig()

    expect(config._shopify).toEqual({ name: 'built' })
    expect(hooks.request).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid runtime module configuration'))
  })
})
