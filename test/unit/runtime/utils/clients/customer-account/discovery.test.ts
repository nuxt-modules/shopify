import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveShopId } from '#src/runtime/utils/clients/customer-account/discovery'
import { configObjectSchema } from '#src/runtime/utils/config'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'
import { stubHangingFetch } from '#test/helpers/fetch'

const apiUrl = (shopId: number, apiVersion: string) =>
  `https://shopify.com/${shopId}/account/customer/api/${apiVersion}/graphql`

const input = {
  name: 'test-shop',
  shopId: '1',
  storefrontId: '187932',

  clients: {
    storefront: {
      publicAccessToken: 'public-token',
      privateAccessToken: 'private-token',
    },

    customerAccount: {
      clientId: 'client-id',
      apiVersion: API_VERSION,
    },

    admin: {
      accessToken: 'admin-token',
    },
  },
}

describe('resolveShopId', () => {
  const baked = configObjectSchema.parse(input)

  const withOverrides = (overrides: Record<string, unknown>) =>
    configObjectSchema.parse({ ...input, ...overrides })

  const stubShopId = (shopId: number) => {
    const json = vi.fn(async () => ({ graphql_api: apiUrl(shopId, OTHER_API_VERSION) }))

    vi.stubGlobal('fetch', vi.fn(async () => ({ json })))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the built shop ID while the store is unchanged', async () => {
    stubShopId(2)

    const config = configObjectSchema.parse(input)

    await expect(resolveShopId(config, baked)).resolves.toBe(config)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('looks the shop ID up again when the store name changed', async () => {
    stubShopId(2)

    const config = await resolveShopId(withOverrides({ name: 'other-shop' }), baked)

    expect(fetch).toHaveBeenCalledWith('https://other-shop.myshopify.com/.well-known/customer-account-api', { signal: expect.any(AbortSignal) })
    expect(config.shopId).toBe('2')
  })

  it('looks it up when the build could not', async () => {
    stubShopId(1)

    const unresolved = withOverrides({ shopId: undefined })
    const config = await resolveShopId(unresolved, unresolved)

    expect(config.shopId).toBe('1')
  })

  it('keeps the build\'s shop ID when the runtime environment sets an empty one', async () => {
    stubShopId(2)

    await expect(resolveShopId(withOverrides({ shopId: '' }), baked)).resolves.toMatchObject({ shopId: '1' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('looks the shop ID up for an empty runtime value when the store name changed', async () => {
    stubShopId(2)

    await expect(resolveShopId(withOverrides({ name: 'other-shop', shopId: '' }), baked)).resolves.toMatchObject({ shopId: '2' })
  })

  it.each([
    ['configured for the build', undefined],
    ['set at runtime', baked],
  ])('never overrules a shop ID %s', async (_, base) => {
    stubShopId(2)

    const config = withOverrides({ name: 'other-shop', shopId: '999' })

    await expect(resolveShopId(config, base)).resolves.toBe(config)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('skips the lookup without a customer account client', async () => {
    stubShopId(2)

    const config = withOverrides({ shopId: undefined, clients: { storefront: input.clients.storefront } })

    await expect(resolveShopId(config)).resolves.toBe(config)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('gives up on a lookup that never answers, so a hanging endpoint can\'t stall the build or every request', async () => {
    const timeout = new AbortController()

    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(timeout.signal)

    stubHangingFetch()

    const resolving = resolveShopId(withOverrides({ shopId: undefined }))

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())

    timeout.abort()

    expect((await resolving).shopId).toBeUndefined()
  })

  it('ignores a well-known URL without a numeric shop ID', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ graphql_api: 'https://shopify.com/account/customer/api/graphql' }) })))

    const config = await resolveShopId(withOverrides({ shopId: undefined }))

    expect(config.shopId).toBeUndefined()
  })

  it('drops the built shop ID, which belongs to the other store, and warns when the new store\'s lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const logger = { warn: vi.fn() }

    await expect(resolveShopId(withOverrides({ name: 'other-shop' }), baked, logger)).resolves.toMatchObject({ name: 'other-shop', shopId: undefined })
    expect(logger.warn).toHaveBeenCalledOnce()
  })
})
