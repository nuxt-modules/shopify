import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCustomerIdentity } from '../../src/runtime/utils/clients/customer-account/auth'

const API_URL = 'https://shopify.com/1234/account/customer/api/2026-04/graphql'

function stubResponse(customer: unknown) {
  vi.stubGlobal('$fetch', vi.fn(async () => ({ data: { customer } })))
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

  it('rejects a response with no customer identity at all', async () => {
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
