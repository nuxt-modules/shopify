import type { TestEventInit } from '#test/helpers/event'

import { vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, toCookieHeader } from '#test/helpers/event'

export const SESSION_PASSWORD = 'a-password-that-is-at-least-32-characters'

export const SHOP_ID = '1'

export const CLIENT_ID = 'client-id'

export const ORIGIN = 'https://shop.test'

export type HydrogenTokens = {
  accessToken?: string
  refreshToken?: string
  idToken?: string
  expiresAt?: number
}

export function createHydrogenSession(tokens: HydrogenTokens = {}) {
  return {
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      idToken: 'id-token',
      expiresAt: Date.now() + 3600_000,
      ...tokens,
    },
  }
}

export const EXPIRED: HydrogenTokens = { expiresAt: Date.now() - 1000 }

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

export function createIdToken(claims: Record<string, unknown>): string {
  return [
    base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    base64Url(JSON.stringify({
      iss: `https://shopify.com/authentication/${SHOP_ID}`,
      aud: CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    })),
    'signature',
  ].join('.')
}

export function createShopifyConfig(customerAccount: Record<string, unknown> = {}) {
  return {
    name: 'test-shop',
    shopId: SHOP_ID,
    defaultMarket: { country: 'US', language: 'EN' },
    clients: {
      customerAccount: {
        clientId: CLIENT_ID,
        apiVersion: API_VERSION,
        afterLogin: '/',
        session: { password: SESSION_PASSWORD },
        ...customerAccount,
      },
    },
  }
}

export const UNCONFIGURED_SHOPIFY_CONFIG = { name: 'test-shop', clients: {} }

function createMemoryStorage() {
  const items = new Map<string, unknown>()

  return {
    items,
    setItem: (key: string, value: unknown, _options?: unknown) => Promise.resolve(void items.set(key, structuredClone(value))),
    getItem: (key: string) => Promise.resolve(items.has(key) ? structuredClone(items.get(key)) : null),
    removeItem: (key: string) => Promise.resolve(void items.delete(key)),
    getMount: (key = '') => ({ base: `${key}:` }),
  }
}

export function createTokenStorages() {
  const storages = new Map<string, ReturnType<typeof createMemoryStorage>>()

  function useTokenStorage(base: string) {
    if (!storages.has(base)) {
      const storage = createMemoryStorage()

      vi.spyOn(storage, 'setItem')
      vi.spyOn(storage, 'removeItem')

      storages.set(base, storage)
    }

    return storages.get(base)!
  }

  return { storages, useTokenStorage }
}

export function createHttpsEvent(cookie?: string, init: TestEventInit = {}) {
  return createTestEvent({ ...init, headers: { 'host': 'shop.test', 'x-forwarded-proto': 'https', ...init.headers, ...(cookie ? { cookie } : {}) } })
}

export async function createSessionCookie(tokens?: HydrogenTokens): Promise<string> {
  const { createCustomerSessionManager } = await import('#src/runtime/server/utils/customer-account/session')

  const event = createHttpsEvent(undefined, { path: '/account/authorize' })
  const sessionManager = createCustomerSessionManager(event)

  await sessionManager.setSessionItem('customerAccount', createHydrogenSession(tokens))

  return toCookieHeader(event)
}
