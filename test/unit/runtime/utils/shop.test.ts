import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'

import { createShopResolver as createTypedShopResolver } from '#src/runtime/utils/shop'

type LookupClient = { request: ReturnType<typeof vi.fn> }

type Market = { country: string, language: string, currency?: string, pathPrefix?: string }

const createShopResolver = createTypedShopResolver as unknown as (
  config: Record<string, unknown>,
  logger: Parameters<typeof createTypedShopResolver>[1],
  getClient?: () => LookupClient,
) => (market?: Market) => Promise<unknown>

const warn = vi.fn()
const logger = createLoggerStub({ warn })

const localized = {
  shop: { id: 'gid://shopify/Shop/1' },
  localization: { country: { isoCode: 'DE', currency: { isoCode: 'EUR' } }, language: { isoCode: 'DE' } },
}

const shop = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }

const placeholderShop = { shopId: '0', storefrontId: '', myshopifyDomain: 'my-shop.myshopify.com' }

function createClient(data: unknown = localized) {
  return { request: vi.fn(() => Promise.resolve({ data })) }
}

function setup(config: Record<string, unknown> = {}, client: LookupClient = createClient()) {
  const getClient = vi.fn(() => client)

  return { client, getClient, resolve: createShopResolver({ name: 'my-shop', analytics: {}, ...config }, logger, getClient) }
}

beforeEach(() => {
  warn.mockClear()
})

describe('createShopResolver', () => {
  it.each([
    ['without i18n', {}],
    ['while i18n is only the empty placeholder declared for environment variables', { i18n: { defaultLocale: { country: '', language: '', currency: '' } } }],
  ])('reads the shop and its default market from the Storefront API %s', async (_, config) => {
    const { client, resolve } = setup(config)

    await expect(resolve()).resolves.toStrictEqual({ shop, shopifyAnalytics: true, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })

    expect(client.request).toHaveBeenCalledWith(expect.any(String), { variables: {} })
  })

  it('skips the lookup, and creates no Storefront client, when the shop and its market are configured', async () => {
    const { getClient, resolve } = setup({ shopId: 'gid://shopify/Shop/2', i18n: { defaultLocale: { country: 'AT', language: 'DE', currency: 'EUR' } } })

    await expect(resolve()).resolves.toMatchObject({ shop: { shopId: 'gid://shopify/Shop/2' }, shopifyAnalytics: true, i18n: { country: 'AT' } })

    expect(getClient).not.toHaveBeenCalled()
  })

  it('gives Shopify\'s scripts a placeholder shop without analytics, and needs no lookup for a configured market', async () => {
    const { client, resolve } = setup({ analytics: false, i18n: { defaultLocale: { country: 'AT', language: 'DE' } } })

    await expect(resolve()).resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'AT', language: 'DE' } })

    expect(client.request).not.toHaveBeenCalled()
  })

  it('looks up only the market without analytics', async () => {
    await expect(setup({ analytics: false }).resolve())
      .resolves.toStrictEqual({ shop: placeholderShop, shopifyAnalytics: false, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('resolves another market in its own context', async () => {
    const { client, resolve } = setup({ i18n: { defaultLocale: { country: 'AT', language: 'DE' } } })

    await expect(resolve({ country: 'CA', language: 'FR' })).resolves.toMatchObject({ i18n: { country: 'CA', language: 'FR', currency: 'EUR' } })

    expect(client.request).toHaveBeenCalledWith(expect.any(String), { variables: { country: 'CA', language: 'FR' } })
  })

  it('looks each market up once', async () => {
    const { client, resolve } = setup()

    await resolve({ country: 'CA', language: 'EN' })
    await resolve({ country: 'CA', language: 'EN' })

    expect(client.request).toHaveBeenCalledOnce()
  })

  it('looks a market up again instead of waiting for another request\'s unfinished lookup', async () => {
    const client = {
      request: vi.fn()
        .mockReturnValueOnce(new Promise(() => {}))
        .mockResolvedValue({ data: localized }),
    }

    const { resolve } = setup({}, client)

    void resolve()

    await vi.waitFor(() => expect(client.request).toHaveBeenCalledOnce())

    const next = resolve()

    await vi.waitFor(() => expect(client.request).toHaveBeenCalledTimes(2))
    await expect(next).resolves.toStrictEqual({ shop, shopifyAnalytics: true, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('starts the scripts in the request\'s market, with its own currency and path prefix', async () => {
    const { client, resolve } = setup({ shopId: 'gid://shopify/Shop/1', i18n: { defaultLocale: { country: 'AT', language: 'DE', currency: 'EUR' } } })

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
    const resolve = createShopResolver({ name: 'my-shop', analytics: {}, i18n: { defaultLocale: { country: 'AT', language: 'DE' } } }, logger)

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
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`i18n.defaultLocale` with its `currency`'), expect.anything())
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

    for (let index = 0; index <= 50; index++) await resolve({ country: `C${index}`, language: 'EN' })

    await resolve({ country: 'C50', language: 'EN' })

    expect(client.request).toHaveBeenCalledTimes(51)

    await resolve({ country: 'C0', language: 'EN' })

    expect(client.request).toHaveBeenCalledTimes(52)
  })
})
