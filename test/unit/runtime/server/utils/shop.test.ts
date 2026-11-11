import { describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

const fetchMock = vi.fn(async (..._args: unknown[]) => Response.json({
  data: { shop: { id: 'gid://shopify/Shop/1' }, localization: { country: { isoCode: 'DE', currency: { isoCode: 'EUR' } }, language: { isoCode: 'DE' } } },
}))

vi.stubGlobal('fetch', fetchMock)

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    _shopify: { name: 'my-shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public', retries: 0 } }, analytics: false },
  }),
}))

const { resolveShopifyScripts } = await import('#src/runtime/server/utils/shop')

describe('resolveShopifyScripts', () => {
  it('resolves Shopify\'s scripts in the market the app set for the request', async () => {
    const event = createTestEvent({ path: '/', headers: { host: 'shop.test' } })

    event.context.shopifyMarket = { country: 'CA', language: 'FR' } as never

    await expect(resolveShopifyScripts(event)).resolves.toMatchObject({ i18n: { country: 'CA', language: 'FR' } })
  })
})
