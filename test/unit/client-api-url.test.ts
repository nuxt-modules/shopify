import { describe, expect, it } from 'vitest'

import { configObjectSchema } from '../../src/schemas'
import { createAdminConfig } from '../../src/runtime/utils/clients/admin'
import { createCustomerAccountConfig } from '../../src/runtime/utils/clients/customer-account'
import { createStorefrontConfig } from '../../src/runtime/utils/clients/storefront'
import { createClient } from '../../src/runtime/utils/clients/create'
import {
  PROXY_API_VERSION_HEADER,
  createTransport,
  isVersionedApiUrl,
  withApiVersion,
} from '../../src/runtime/utils/clients/transport'

const storefront = { name: 'shop', clients: { storefront: { apiVersion: '2026-04', publicAccessToken: 'tok', retries: 0 } } }

const proxiedStorefront = configObjectSchema.parse({ name: 'shop', clients: { storefront: { apiVersion: '2026-04', publicAccessToken: 'tok' } } })
const admin = { name: 'shop', clients: { admin: { apiVersion: '2026-04', accessToken: 'shpat_x', retries: 0 } } }
const mock = { name: 'shop', clients: { storefront: { apiVersion: '2026-04', mock: true, retries: 0 } } }

const customerAccount = {
  name: 'shop',
  clients: {
    customerAccount: {
      apiVersion: '2026-04',
      clientId: 'cid',
      apiUrl: 'https://shopify.com/1234/account/customer/api/2026-04/graphql',
      retries: 0,
    },
  },
}

describe('withApiVersion', () => {
  it('replaces the version segment of every Shopify API url shape', () => {
    expect(withApiVersion('https://shop.myshopify.com/api/2026-04/graphql.json', '2026-01'))
      .toBe('https://shop.myshopify.com/api/2026-01/graphql.json')

    expect(withApiVersion('https://shop.myshopify.com/admin/api/2026-04/graphql.json', '2026-01'))
      .toBe('https://shop.myshopify.com/admin/api/2026-01/graphql.json')

    expect(withApiVersion('https://shopify.com/1234/account/customer/api/2026-04/graphql', '2026-01'))
      .toBe('https://shopify.com/1234/account/customer/api/2026-01/graphql')

    expect(withApiVersion('https://mock.shop/api/2026-04/graphql.json', '2026-01'))
      .toBe('https://mock.shop/api/2026-01/graphql.json')
  })

  it('leaves a proxy url untouched', () => {
    expect(withApiVersion('http://localhost:3000/_proxy/storefront', '2026-01'))
      .toBe('http://localhost:3000/_proxy/storefront')

    expect(isVersionedApiUrl('http://localhost:3000/_proxy/storefront')).toBe(false)
    expect(isVersionedApiUrl('https://shop.myshopify.com/admin/api/2026-04/graphql.json')).toBe(true)
  })
})

describe('per-request apiVersion override', () => {
  it('keeps the storefront endpoint', () => {
    const transport = createTransport(createStorefrontConfig(storefront as never))

    expect(transport.getApiUrl()).toBe('https://shop.myshopify.com/api/2026-04/graphql.json')
    expect(transport.getApiUrl('2026-01')).toBe('https://shop.myshopify.com/api/2026-01/graphql.json')
  })

  it('keeps the admin prefix', () => {
    const transport = createTransport(createAdminConfig(admin as never))

    expect(transport.getApiUrl('2026-01')).toBe('https://shop.myshopify.com/admin/api/2026-01/graphql.json')
  })

  it('keeps the customer account host', () => {
    const transport = createTransport(createCustomerAccountConfig(customerAccount as never))

    expect(transport.getApiUrl('2026-01')).toBe('https://shopify.com/1234/account/customer/api/2026-01/graphql')
  })

  it('keeps the mock storefront host', () => {
    const transport = createTransport(createStorefrontConfig(mock as never))

    expect(transport.getApiUrl('2026-01')).toBe('https://mock.shop/api/2026-01/graphql.json')
  })
})

describe('client-level apiVersion option', () => {
  const definition = { kind: 'storefront', createConfig: createStorefrontConfig, cache: true } as never

  it('rewrites the request url, not just the reported version', () => {
    const client = createClient(definition, storefront as never, { apiVersion: '2026-01' } as never)

    expect(client.config.apiVersion).toBe('2026-01')
    expect(client.config.apiUrl).toBe('https://shop.myshopify.com/api/2026-01/graphql.json')
  })

  it('asks the proxy for the version instead of bypassing it', () => {
    const client = createClient(definition, proxiedStorefront as never, {
      apiVersion: '2026-01',
      origin: 'http://localhost:3000',
    } as never)

    expect(client.config.apiUrl).toBe('http://localhost:3000/_proxy/storefront')
    expect(client.config.headers[PROXY_API_VERSION_HEADER]).toBe('2026-01')
  })

  it('does not set the proxy version header when no override is given', () => {
    const client = createClient(definition, proxiedStorefront as never, { origin: 'http://localhost:3000' } as never)

    expect(client.config.apiUrl).toBe('http://localhost:3000/_proxy/storefront')
    expect(client.config.headers[PROXY_API_VERSION_HEADER]).toBeUndefined()
  })
})

describe('client config resolution', () => {
  it('sends the private token in preference to the public one', () => {
    const config = createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: '2026-04', publicAccessToken: 'public', privateAccessToken: 'private', retries: 0 } },
    } as never)

    expect(config.headers).toMatchObject({ 'Shopify-Storefront-Private-Token': 'private' })
    expect(config.headers['X-Shopify-Storefront-Access-Token']).toBeUndefined()
  })

  it('refuses to build a storefront config without a token', () => {
    expect(() => createStorefrontConfig({
      name: 'shop',
      clients: { storefront: { apiVersion: '2026-04', retries: 0 } },
    } as never)).toThrow(/missing access token/)
  })

  it('refuses to build a client config without a shop name', () => {
    expect(() => createStorefrontConfig({
      name: '',
      clients: { storefront: { apiVersion: '2026-04', publicAccessToken: 'tok', retries: 0 } },
    } as never)).toThrow(/missing shop name/)
  })
})
