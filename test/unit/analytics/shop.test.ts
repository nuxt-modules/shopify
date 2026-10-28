import { beforeEach, describe, expect, it, vi } from 'vitest'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#src/runtime/utils/log', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}))

const { createShopResolver } = await import('#src/runtime/utils/analytics/shop')

const localized = {
  shop: { id: 'gid://shopify/Shop/1' },
  localization: { country: { isoCode: 'DE', currency: { isoCode: 'EUR' } }, language: { isoCode: 'DE' } },
}

const analytics = { autoPageView: true, consent: { mode: 'no-banner' } } as const

const shop = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }

function createClient(data: unknown = localized) {
  return { request: vi.fn(() => Promise.resolve({ data })) }
}

function setup(config: Record<string, string> = {}, client = createClient()) {
  return { client, resolve: createShopResolver('my-shop', { ...analytics, ...config }, client as never) }
}

beforeEach(() => {
  warn.mockClear()
})

describe('createShopResolver', () => {
  it('reads the shop and its default market from the Storefront API', async () => {
    await expect(setup().resolve()).resolves.toStrictEqual({ shop, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('skips the lookup when the shop and its market are configured', async () => {
    const { client, resolve } = setup({ shopId: 'gid://shopify/Shop/2', country: 'AT', language: 'DE', currency: 'EUR' })

    await expect(resolve()).resolves.toMatchObject({ shop: { shopId: 'gid://shopify/Shop/2' }, i18n: { country: 'AT' } })

    expect(client.request).not.toHaveBeenCalled()
  })

  it('prefers the configured default market over the lookup', async () => {
    await expect(setup({ country: 'AT' }).resolve()).resolves.toMatchObject({ i18n: { country: 'AT', language: 'DE', currency: 'EUR' } })
  })

  it('resolves another market in its own context', async () => {
    const { client, resolve } = setup({ country: 'AT' })

    await expect(resolve({ country: 'CA', language: 'FR' })).resolves.toMatchObject({ i18n: { country: 'DE' } })

    expect(client.request).toHaveBeenCalledWith(expect.any(String), { variables: { country: 'CA', language: 'FR' } })
  })

  it('looks each market up once', async () => {
    const { client, resolve } = setup()

    await resolve({ country: 'CA' })
    await resolve({ country: 'CA' })

    expect(client.request).toHaveBeenCalledOnce()
  })

  it('attributes events to the configured storefront', async () => {
    await expect(setup({ storefrontId: '123' }).resolve()).resolves.toMatchObject({ shop: { storefrontId: '123' } })
  })

  it('leaves the market out when Shopify does not report it', async () => {
    await expect(setup({}, createClient({ shop: localized.shop })).resolve()).resolves.toStrictEqual({ shop })
  })

  it('gives up without a shop ID and tries again later', async () => {
    const client = createClient(null)
    const { resolve } = setup({}, client)

    await expect(resolve()).resolves.toBeNull()
    await expect(resolve()).resolves.toBeNull()

    expect(warn).toHaveBeenCalled()
    expect(client.request).toHaveBeenCalledTimes(2)
  })
})
