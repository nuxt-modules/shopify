import type { WritableCustomerSessionManager } from '@shopify/hydrogen/customer-account'
import type { H3Event, SessionConfig } from 'h3'
import type { Storage } from 'unstorage'

import type { ShopifyCustomerAccountSession, ShopifyCustomerAccountSessionData, ShopifyConfig } from '../../../../module'

import { createCustomerSession } from '@shopify/hydrogen/customer-account'
import { clearSession, createError, getCookie, getSession, updateSession } from 'h3'
import { getRouteRules, useStorage } from 'nitropack/runtime'
import { hash } from 'ohash'
import { useRuntimeConfig } from '#imports'

import { DEFAULT_SESSION_NAME, SESSION_PASSWORD_ENV, SESSION_PASSWORD_MIN_LENGTH, isUsableSessionPassword } from '../../../utils/session'
import { warnUnmountedStorage } from '../../../utils/storage'
import { getPublicRequestURL, getShopifyRequestContext } from '../routes'

const HYDROGEN_SESSION_KEY = 'customerAccount'

const DEFAULT_TOKEN_STORAGE = 'customer-account-token'

type CustomerSessionWithInternals = ReturnType<typeof createCustomerSession>

type HydrogenSessionItem = Record<string, unknown> & { tokens?: unknown }

type StoredTokens = {
  tokens: unknown
  replaces?: string[]
}

const customerSessions = new Map<string, CustomerSessionWithInternals>()

const tokenKeysWrittenBy = new WeakMap<H3Event, Set<string>>()

export function requireCustomerAccountConfig(config?: ShopifyConfig): NonNullable<ShopifyConfig['clients']['customerAccount']> {
  const customerAccount = config?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  return customerAccount
}

export function getHydrogenCustomerSession(config?: ShopifyConfig): CustomerSessionWithInternals {
  const customerAccount = requireCustomerAccountConfig(config)
  const shopId = config?.shopId

  if (!shopId) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to resolve the shop ID: set `shopId`, or enable the Customer Account API for your store so the module can look it up',
    })
  }

  const key = `${shopId}:${customerAccount.clientId}`

  let session = customerSessions.get(key)

  if (!session) {
    session = createCustomerSession({ shopId, customerAccountApiClientId: customerAccount.clientId })

    customerSessions.set(key, session)
  }

  return session
}

export function getSessionConfig(config?: ShopifyConfig): SessionConfig {
  const session = config?.clients?.customerAccount?.session
  const candidates = [session?.password, globalThis.process?.env?.[SESSION_PASSWORD_ENV]]
  const password = candidates.find(isUsableSessionPassword)

  if (!password) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: `[shopify] Failed to resolve the customer account session: ${candidates.some(Boolean)
        ? `the session password must be a random secret of at least ${SESSION_PASSWORD_MIN_LENGTH} characters`
        : 'no session password configured'}. `
        + 'Set `shopify.clients.customerAccount.session.password` or the '
        + `\`${SESSION_PASSWORD_ENV}\` environment variable`,
    })
  }

  return {
    name: session?.name || DEFAULT_SESSION_NAME,
    password,
    maxAge: session?.maxAge,
    sessionHeader: false,
    cookie: {
      sameSite: 'lax',
      ...session?.cookie,
      httpOnly: true,
    },
  }
}

function hasSessionCookie(event: H3Event, config: SessionConfig): boolean {
  const { cache, isr } = getRouteRules(event)

  return !(cache || isr) && !!getCookie(event, config.name || DEFAULT_SESSION_NAME)
}

async function readSession(event: H3Event, config: SessionConfig) {
  if (!hasSessionCookie(event, config)) return null

  return await getSession<ShopifyCustomerAccountSessionData>(event, config)
}

function getTokenStorage(config?: ShopifyConfig) {
  const tokenStorage = config?.clients?.customerAccount?.tokenStorage

  if (!tokenStorage) return undefined

  const base = typeof tokenStorage === 'string' ? tokenStorage : DEFAULT_TOKEN_STORAGE
  const storage = useStorage(base)

  warnUnmountedStorage(storage, base, config?.logger)

  return storage
}

function getTokenStorageOptions(config?: ShopifyConfig) {
  const maxAge = config?.clients?.customerAccount?.session?.maxAge

  return maxAge ? { ttl: maxAge } : undefined
}

function holdsTokens(data: ShopifyCustomerAccountSessionData): boolean {
  return !!(data.tokenKey || (data.customerAccount as HydrogenSessionItem | undefined)?.tokens)
}

function createTokenStore(event: H3Event, storage: Storage, options?: { ttl: number }) {
  const written = tokenKeysWrittenBy.get(event) ?? new Set<string>()

  tokenKeysWrittenBy.set(event, written)

  return {
    async read(key: string) {
      const entry = await storage.getItem<StoredTokens>(key)

      if (!entry) return undefined

      if (entry.replaces?.length && !written.has(key)) {
        await Promise.all(entry.replaces.map(replaced => storage.removeItem(replaced)))
        await storage.setItem(key, { tokens: entry.tokens }, options)
      }

      return entry.tokens
    },

    async write(tokens: unknown, currentKey?: string) {
      const key = hash(tokens)

      if (key === currentKey) return key

      const current = currentKey ? await storage.getItem<StoredTokens>(currentKey) : null
      const replaces = currentKey ? [currentKey, ...current?.replaces ?? []] : []

      await storage.setItem(key, replaces.length ? { tokens, replaces } : { tokens }, options)

      written.add(key)

      return key
    },

    async remove(key: string) {
      const entry = await storage.getItem<StoredTokens>(key)

      await Promise.all([key, ...entry?.replaces ?? []].map(removed => storage.removeItem(removed)))
    },
  }
}

export function createCustomerSessionManager(event: H3Event): WritableCustomerSessionManager {
  const { _shopify } = useRuntimeConfig(event)

  const config = getSessionConfig(_shopify)
  const storage = getTokenStorage(_shopify)
  const tokenStore = storage ? createTokenStore(event, storage, getTokenStorageOptions(_shopify)) : undefined

  return {
    getSessionOrigin: () => getPublicRequestURL(event).origin,

    async getSessionItem(key) {
      const session = await readSession(event, config)

      if (!session) return undefined

      if (key !== HYDROGEN_SESSION_KEY || !tokenStore) return session.data[key as keyof ShopifyCustomerAccountSessionData]

      const item = session.data.customerAccount as HydrogenSessionItem | undefined
      const tokens = session.data.tokenKey ? await tokenStore.read(session.data.tokenKey) : undefined

      return tokens ? { ...item, tokens } : item
    },

    async setSessionItem(key, value) {
      const session = await getSession<ShopifyCustomerAccountSessionData>(event, config)

      if (!holdsTokens(session.data)) session.createdAt = Date.now()

      if (key !== HYDROGEN_SESSION_KEY || !tokenStore) {
        await updateSession(event, config, { [key]: value })

        return
      }

      const { tokens, ...item } = value as HydrogenSessionItem

      if (!tokens && session.data.tokenKey) await tokenStore.remove(session.data.tokenKey)

      await updateSession(event, config, {
        tokenKey: tokens ? await tokenStore.write(tokens, session.data.tokenKey) : undefined,
        customerAccount: Object.keys(item).length ? item : undefined,
      })
    },

    async removeSessionItem(key) {
      const session = await readSession(event, config)

      if (!session) return

      if (key !== HYDROGEN_SESSION_KEY || !tokenStore) {
        await updateSession(event, config, { [key]: undefined })

        return
      }

      if (session.data.tokenKey) await tokenStore.remove(session.data.tokenKey)

      await updateSession(event, config, { tokenKey: undefined, customerAccount: undefined })
    },
  }
}

/**
 * Reads the customer account session for the current request.
 *
 * @param event the current request event
 *
 * @returns the session, `{ isLoggedIn }`, which tells whether the customer is signed in
 */
export async function getCustomerAccountSession(event: H3Event): Promise<ShopifyCustomerAccountSession> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await readSession(event, getSessionConfig(_shopify))

  if (!session || !holdsTokens(session.data)) return { isLoggedIn: false }

  return { isLoggedIn: await getHydrogenCustomerSession(_shopify).isLoggedIn(createCustomerSessionManager(event), await getShopifyRequestContext(event)) }
}

/**
 * Reads the customer account session and rejects the request when nobody is signed in.
 *
 * @param event the current request event
 *
 * @returns the session of the signed in customer
 *
 * @throws a 401 unauthorized error when there is no active session
 */
export async function requireCustomerAccountSession(event: H3Event): Promise<ShopifyCustomerAccountSession> {
  const session = await getCustomerAccountSession(event)

  if (!session.isLoggedIn) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: '[shopify] No customer account session: the customer is not logged in',
    })
  }

  return session
}

/**
 * Ends the customer account session locally and removes any stored tokens, without signing out of Shopify.
 *
 * @param event the current request event
 */
export async function clearCustomerAccountSession(event: H3Event): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const config = getSessionConfig(_shopify)

  if (!hasSessionCookie(event, config)) return

  await createCustomerSessionManager(event).removeSessionItem(HYDROGEN_SESSION_KEY)

  await clearSession(event, config)
}
