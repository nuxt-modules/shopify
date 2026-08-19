import type { CustomerAccountTokenSet, CustomerAccountUser } from '#src/types/auth'

export const SESSION_PASSWORD = 'a-password-that-is-at-least-32-characters'

export const CUSTOMER: CustomerAccountUser = {
  id: 'gid://shopify/Customer/1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'customer@example.com',
  phone: null,
}

export function createTokenSet(overrides: Partial<CustomerAccountTokenSet> = {}): CustomerAccountTokenSet {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
    expiresAt: Date.now() + 3600_000,
    ...overrides,
  }
}

export function createShopifyConfig(customerAccount: Record<string, unknown> = {}) {
  return {
    name: 'test-shop',
    clients: {
      customerAccount: {
        clientId: 'client-id',
        session: { password: SESSION_PASSWORD },
        ...customerAccount,
      },
    },
  }
}

export const UNCONFIGURED_SHOPIFY_CONFIG = { name: 'test-shop', clients: {} }

export function createNoopStorage() {
  return {
    setItem: () => Promise.resolve(),
    getItem: () => Promise.resolve(null),
    removeItem: () => Promise.resolve(),
  }
}
