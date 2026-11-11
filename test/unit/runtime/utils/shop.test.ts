import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#src/runtime/utils/log', () => ({
  createLogger: () => createLoggerStub({ warn }),
}))

const { createShopResolver } = await import('#src/runtime/utils/shop')

const localized = {
  shop: { id: 'gid://shopify/Shop/1' },
  localization: { country: { isoCode: 'DE', currency: { isoCode: 'EUR' } }, language: { isoCode: 'DE' } },
}

const shop = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }

const placeholderShop = { shopId: '0', storefrontId: '', myshopifyDomain: 'my-shop.myshopify.com' }

function createClient(data: unknown = localized) {
  return { request: vi.fn(() => Promise.resolve({ data })) }
}

type ResolverConfig = Partial<Parameters<typeof createShopResolver>[0]>

function setup(config: ResolverConfig = {}, client: { request: ReturnType<typeof vi.fn> } = createClient()) {
  const getClient = vi.fn(() => client)

  return { client, getClient, resolve: createShopResolver({ name: 'my-shop', analytics: {} as never, ...config }, getClient as never) }
}

beforeEach(() => {
  warn.mockClear()
})

describe('createShopResolver', () => {
  it('reads the shop and its default market from the Storefront API', async () => {
    await expect(setup().resolve()).resolves.toStrictEqual({ shop, shopifyAnalytics: true, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('skips the lookup, and creates no Storefront client, when the shop and its market are configured', async () => {
    const { getClient, resolve } = setup({ shopId: 'gid://shopify/Shop/2', defaultMarket: { country: 'AT', language: 'DE', currency: 'EUR' } })

    await expect(resolve()).resolves.toMatchObject({ shop: { shopId: 'gid://shopify/Shop/2' }, shopifyAnalytics: true, i18n: { country: 'AT' } })

    expect(getClient).not.toHaveBeenCalled()
  })

  it('gives Shopify\'s scripts a placeholder shop without analytics, and needs no lookup for a configured market', async () => {
    const { client, resolve } = setup({ analytics: false, defaultMarket: { country: 'AT', language: 'DE' } })

    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'AT', language: 'DE' } })

    expect(client.request).not.toHaveBeenCalled()
  })

  it('looks up only the market without analytics', async () => {
    await expect(setup({ analytics: false }).resolve())
      .resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('resolves another market in its own context', async () => {
    const { client, resolve } = setup({ defaultMarket: { country: 'AT', language: 'DE' } })

    await expect(resolve({ country: 'CA', language: 'FR' })).resolves.toMatchObject({ i18n: { country: 'CA', language: 'FR', currency: 'EUR' } })

    expect(client.request).toHaveBeenCalledWith(expect.any(String), { variables: { country: 'CA', language: 'FR' } })
  })

  it('looks each market up once', async () => {
    const { client, resolve } = setup()

    await resolve({ country: 'CA', language: 'EN' })
    await resolve({ country: 'CA', language: 'EN' })

    expect(client.request).toHaveBeenCalledOnce()
  })

  it('starts the scripts in the request\'s market, with its own currency and path prefix', async () => {
    const { client, resolve } = setup({ shopId: 'gid://shopify/Shop/1', defaultMarket: { country: 'AT', language: 'DE', currency: 'EUR' } })

    await expect(resolve({ country: 'CH', language: 'FR', currency: 'CHF', pathPrefix: '/fr-ch' }))
      .resolves.toStrictEqual({ shop, shopifyAnalytics: true, i18n: { country: 'CH', language: 'FR', currency: 'CHF', pathPrefix: '/fr-ch' } })

    expect(client.request).not.toHaveBeenCalled()
  })

  it('looks up the currency of a request\'s market that comes without one', async () => {
    const { client, resolve } = setup({ shopId: 'gid://shopify/Shop/1' }, createClient({
      shop: localized.shop,
      localization: { country: { isoCode: 'CH', currency: { isoCode: 'CHF' } }, language: { isoCode: 'FR' } },
    }))

    await expect(resolve({ country: 'CH', language: 'FR' })).resolves.toMatchObject({ i18n: { country: 'CH', language: 'FR', currency: 'CHF' } })

    expect(client.request).toHaveBeenCalledWith(expect.any(String), { variables: { country: 'CH', language: 'FR' } })
  })

  it('attributes events to the configured storefront', async () => {
    await expect(setup({ storefrontId: '123' }).resolve()).resolves.toMatchObject({ shop: { storefrontId: '123' } })
  })

  it('leaves the market out when Shopify does not report it', async () => {
    await expect(setup({}, createClient({ shop: localized.shop })).resolve()).resolves.toStrictEqual({ shop, shopifyAnalytics: true })
  })

  it('renders what is configured, without warning or retrying, when there is no Storefront client to look anything up with', async () => {
    const resolve = createShopResolver({ name: 'my-shop', analytics: {} as never, defaultMarket: { country: 'AT', language: 'DE' } })

    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'AT', language: 'DE' } })
    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'AT', language: 'DE' } })

    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps Shopify\'s scripts, without analytics, while the lookup fails, and looks again on every request with a single warning', async () => {
    const client = {
      request: vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValue({ data: localized }),
    }

    const { resolve } = setup({}, client)

    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false })
    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false })
    await expect(resolve()).resolves.toStrictEqual({ shop, shopifyAnalytics: true, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })

    expect(client.request).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`defaultMarket` with its `currency`'), expect.anything())
  })

  it('counts a lookup that comes back without data as failed, when errors don\'t throw', async () => {
    const client = {
      request: vi.fn()
        .mockResolvedValueOnce({ errors: { message: 'Internal error' } })
        .mockResolvedValue({ data: localized }),
    }

    const { resolve } = setup({ shopId: 'gid://shopify/Shop/1' }, client)

    await expect(resolve()).resolves.toStrictEqual({ shop, shopifyAnalytics: true })
    await expect(resolve()).resolves.toMatchObject({ i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })

    expect(client.request).toHaveBeenCalledTimes(2)
  })

  it('keeps a bounded number of markets', async () => {
    const { client, resolve } = setup()

    for (let index = 0; index <= 50; index++) await resolve({ country: `C${index}`, language: 'EN' } as never)

    await resolve({ country: 'C50', language: 'EN' } as never)

    expect(client.request).toHaveBeenCalledTimes(51)

    await resolve({ country: 'C0', language: 'EN' } as never)

    expect(client.request).toHaveBeenCalledTimes(52)
  })
})
