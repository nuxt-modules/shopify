import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveApiUrl } from '#src/runtime/utils/resolve'
import { configObjectSchema } from '#src/schemas'
import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'

const apiUrl = (shopId: number, apiVersion: string) =>
  `https://shopify.com/${shopId}/account/customer/api/${apiVersion}/graphql`

const input = {
  name: 'test-shop',

  clients: {
    storefront: {
      publicAccessToken: 'public-token',
      privateAccessToken: 'private-token',
    },

    customerAccount: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      apiVersion: API_VERSION,
      apiURL: apiUrl(1, API_VERSION),
    },

    admin: {
      accessToken: 'admin-token',
    },
  },

  analytics: {
    storefrontId: '187932',
  },
}

const resolved = configObjectSchema.parse(input)

describe('runtime config', () => {
  it('re-parses the baked config to an identical config', () => {
    expect(configObjectSchema.parse(resolved)).toEqual(resolved)
  })

  it('keeps a client the build disabled disabled', () => {
    const config = { ...resolved, clients: { ...resolved.clients, customerAccount: undefined } }

    expect(configObjectSchema.parse(config).clients.customerAccount).toBeUndefined()
  })
})

describe('resolveApiUrl', () => {
  const baked = configObjectSchema.parse(input)

  const withOverrides = (overrides: Record<string, unknown>) =>
    configObjectSchema.parse({ ...input, ...overrides })

  const withCustomerAccount = (overrides: Record<string, unknown>) => ({
    clients: { ...input.clients, customerAccount: { ...input.clients.customerAccount, ...overrides } },
  })

  const stubApiUrl = (url: string) => {
    const json = vi.fn(async () => ({ graphql_api: url }))

    vi.stubGlobal('fetch', vi.fn(async () => ({ json })))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the built URL when nothing it depends on changed', async () => {
    stubApiUrl(apiUrl(1, OTHER_API_VERSION))

    const config = configObjectSchema.parse(input)

    await expect(resolveApiUrl(config, baked)).resolves.toBe(config)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('resolves again when the store name changed', async () => {
    stubApiUrl(apiUrl(2, OTHER_API_VERSION))

    const config = await resolveApiUrl(withOverrides({ name: 'other-shop' }), baked)

    expect(fetch).toHaveBeenCalledWith('https://other-shop.myshopify.com/.well-known/customer-account-api')
    expect(config.clients.customerAccount?.apiURL).toBe(apiUrl(2, API_VERSION))
  })

  it('resolves again when the api version changed', async () => {
    stubApiUrl(apiUrl(1, API_VERSION))

    const config = await resolveApiUrl(withOverrides(withCustomerAccount({ apiVersion: OTHER_API_VERSION })), baked)

    expect(config.clients.customerAccount?.apiURL).toBe(apiUrl(1, OTHER_API_VERSION))
  })

  it('resolves when the build could not', async () => {
    stubApiUrl(apiUrl(1, OTHER_API_VERSION))

    const unresolved = withOverrides(withCustomerAccount({ apiURL: undefined }))
    const config = await resolveApiUrl(unresolved, unresolved)

    expect(config.clients.customerAccount?.apiURL).toBe(apiUrl(1, API_VERSION))
  })

  it('never overrules an explicitly configured URL', async () => {
    stubApiUrl(apiUrl(2, API_VERSION))

    const config = withOverrides({
      name: 'other-shop',
      ...withCustomerAccount({ apiURL: 'https://explicit.example/graphql' }),
    })

    await expect(resolveApiUrl(config, baked)).resolves.toBe(config)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps the built URL and warns when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const logger = { warn: vi.fn() }
    const config = withOverrides({ name: 'other-shop' })

    await expect(resolveApiUrl(config, baked, logger)).resolves.toBe(config)
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  it('does nothing without a customer account client', async () => {
    const config = withOverrides({ name: 'other-shop', clients: { storefront: input.clients.storefront } })

    await expect(resolveApiUrl(config, baked)).resolves.toBe(config)
  })
})
