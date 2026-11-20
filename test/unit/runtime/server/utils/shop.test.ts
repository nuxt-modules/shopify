import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const fetchMock = vi.fn(async (..._args: unknown[]) => Response.json({
  data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: 'DE', currency: { isoCode: 'EUR' } }, language: { isoCode: 'DE' } } },
}))

vi.stubGlobal('fetch', fetchMock)

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}

const hooks = {
  callHook: vi.fn(async (_name: string, _params: unknown) => {}),
  callHookWith: vi.fn((_caller: unknown, _name: string, ..._args: unknown[]) => {}),
}

vi.mock('#imports', () => ({ useRuntimeConfig: () => runtimeConfig }))

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => runtimeConfig, useNitroApp: () => ({ hooks }) }))

async function resolveShopifyScripts(path: string, config: Record<string, unknown>) {
  runtimeConfig._shopify = { name: 'my-shop', analytics: false, ...config }

  const { resolveShopifyScripts } = await import('#src/runtime/server/utils/shop')

  return resolveShopifyScripts(createTestEvent({ path, headers: { host: 'shop.test' } }))
}

beforeEach(() => {
  vi.resetModules()
  hooks.callHook.mockClear()
  hooks.callHookWith.mockClear()
})

describe('resolveShopifyScripts', () => {
  it('resolves Shopify\'s scripts in the locale of the request', async () => {
    const i18n = { defaultLocale: { country: 'US', language: 'EN' }, routing: { type: 'pathname', locales: [{ country: 'CA', language: 'FR' }] } }

    await expect(resolveShopifyScripts('/fr-ca/products/shirt', { clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0 } }, i18n }))
      .resolves.toMatchObject({ i18n: { country: 'CA', language: 'FR', pathPrefix: '/fr-ca' } })
  })

  it('still resolves Shopify\'s scripts when the request has no locale, such as without a storefront client to look one up with', async () => {
    await expect(resolveShopifyScripts('/', { clients: {} })).resolves.toStrictEqual({
      shop: { shopId: '0', storefrontId: '', myshopifyDomain: 'my-shop.myshopify.com' },
      shopifyAnalytics: false,
    })
  })

  it('looks the shop up through the storefront client hooks, like every other storefront request on the server', async () => {
    await resolveShopifyScripts('/', { analytics: true, clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0 } }, i18n: { defaultLocale: { country: 'US', language: 'EN' } } })

    expect(hooks.callHookWith).toHaveBeenCalledWith(expect.any(Function), 'shopify:storefront:client:configure', expect.anything())
    expect(hooks.callHook.mock.calls.map(([name]) => name)).toEqual([
      'shopify:storefront:client:create',
      'shopify:storefront:client:request',
      'shopify:storefront:client:response',
    ])
    expect(hooks.callHook).toHaveBeenCalledWith('shopify:storefront:client:response', expect.objectContaining({ operation: expect.stringContaining('query ShopifyShopContext') }))
  })
})
