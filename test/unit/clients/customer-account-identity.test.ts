import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCustomerIdentity } from '#src/runtime/utils/clients/customer-account/auth'
import { API_VERSION } from '#test/helpers/api-version'

const API_URL = `https://shopify.com/1234/account/customer/api/${API_VERSION}/graphql`

function stubResponse(customer: unknown) {
  const fetch = vi.fn(async () => ({ data: { customer } }))

  vi.stubGlobal('$fetch', fetch)

  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchCustomerIdentity', () => {
  it('reads an email customer', async () => {
    stubResponse({
      id: 'gid://shopify/Customer/1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: { emailAddress: 'ada@example.com' },
      phoneNumber: null,
    })

    await expect(fetchCustomerIdentity(API_URL, 'token')).resolves.toStrictEqual({
      id: 'gid://shopify/Customer/1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: null,
    })
  })

  it('reads a phone-only customer', async () => {
    stubResponse({
      id: 'gid://shopify/Customer/2',
      firstName: null,
      lastName: null,
      emailAddress: null,
      phoneNumber: { phoneNumber: '+15145551234' },
    })

    await expect(fetchCustomerIdentity(API_URL, 'token')).resolves.toStrictEqual({
      id: 'gid://shopify/Customer/2',
      firstName: null,
      lastName: null,
      email: null,
      phone: '+15145551234',
    })
  })

  it('queries the customer account api with the raw access token as authorization', async () => {
    const fetch = stubResponse({ id: 'gid://shopify/Customer/1', firstName: null, lastName: null, emailAddress: null, phoneNumber: null })

    await fetchCustomerIdentity(API_URL, 'access-token')

    expect(fetch).toHaveBeenCalledWith(API_URL, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'access-token' }),
    }))
  })

  it('rejects a response without a customer', async () => {
    stubResponse(null)

    await expect(fetchCustomerIdentity(API_URL, 'token')).rejects.toThrow(/incomplete customer response/)
  })

  it('rejects a customer without an id', async () => {
    stubResponse({ id: null, firstName: 'Ada', lastName: null, emailAddress: null, phoneNumber: null })

    await expect(fetchCustomerIdentity(API_URL, 'token')).rejects.toThrow(/incomplete customer response/)
  })

  it('wraps a transport failure', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    await expect(fetchCustomerIdentity(API_URL, 'token')).rejects.toThrow(/Failed to fetch the customer identity/)
  })
})
