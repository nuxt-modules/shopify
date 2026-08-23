import type { H3Event, SessionConfig } from 'h3'
import type { Storage } from 'unstorage'

import type { CustomerAccountSession, CustomerAccountSessionData, CustomerAccountTokenSet, CustomerAccountUser, ShopifyConfig } from '../../../../module'

import { createError, getCookie, getSession, useSession } from 'h3'
import { useStorage } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { SESSION_DEFAULT_NAME, SESSION_PASSWORD_ENV } from '../../../utils/session'

export type { CustomerAccountSession, CustomerAccountSessionData, CustomerAccountTokenSet, CustomerAccountUser } from '../../../../module'

export function getSessionConfig(config?: ShopifyConfig): SessionConfig {
  const session = config?.clients?.customerAccount?.session
  const password = session?.password || globalThis.process?.env?.[SESSION_PASSWORD_ENV]

  if (!password) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to resolve the customer account session: no session password configured. '
        + 'Set `shopify.clients.customerAccount.session.password` or the '
        + `\`${SESSION_PASSWORD_ENV}\` environment variable.`,
    })
  }

  return {
    name: session?.name ?? SESSION_DEFAULT_NAME,
    password,
    maxAge: session?.maxAge,
    cookie: {
      sameSite: 'lax',
      secure: !import.meta.dev,
      ...session?.cookie,
      httpOnly: true,
    },
  }
}

async function readSession(event: H3Event, config: SessionConfig) {
  if (!getCookie(event, config.name ?? SESSION_DEFAULT_NAME)) return null

  return await getSession<CustomerAccountSessionData>(event, config)
}

export function usesExternalTokenStorage(config?: ShopifyConfig): boolean {
  return !!config?.clients?.customerAccount?.tokenStorage
}

export function getCustomerAccountTokenStorage(config?: ShopifyConfig): Storage<CustomerAccountTokenSet> {
  const tokenStorage = config?.clients?.customerAccount?.tokenStorage

  const base = typeof tokenStorage === 'string' ? tokenStorage : 'customer-account-token'

  return useStorage<CustomerAccountTokenSet>(base)
}

function getTokenStorageOptions(config?: ShopifyConfig) {
  const maxAge = config?.clients?.customerAccount?.session?.maxAge

  return maxAge ? { ttl: maxAge } : undefined
}

async function storeCustomerAccountTokens(config: ShopifyConfig | undefined, id: string, tokens: CustomerAccountTokenSet): Promise<void> {
  await getCustomerAccountTokenStorage(config).setItem(id, tokens, getTokenStorageOptions(config))
}

export async function setCustomerAccountSession(event: H3Event, data: { user: CustomerAccountUser, tokens: CustomerAccountTokenSet, loggedInAt: number }): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await useSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  if (usesExternalTokenStorage(_shopify)) {
    await session.update({ user: data.user, loggedInAt: data.loggedInAt })

    await storeCustomerAccountTokens(_shopify, session.id!, data.tokens)
  }
  else {
    await session.update({ user: data.user, loggedInAt: data.loggedInAt, tokens: data.tokens })
  }
}

export async function setCustomerAccountTokens(event: H3Event, tokens: CustomerAccountTokenSet): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const sessionConfig = getSessionConfig(_shopify)

  if (!getCookie(event, sessionConfig.name ?? SESSION_DEFAULT_NAME)) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: '[shopify] Failed to store the customer account tokens: no authenticated customer account session',
    })
  }

  const session = await useSession<CustomerAccountSessionData>(event, sessionConfig)

  if (usesExternalTokenStorage(_shopify)) {
    await storeCustomerAccountTokens(_shopify, session.id!, tokens)
  }
  else {
    await session.update({ tokens })
  }
}

export async function getCustomerAccountTokens(event: H3Event): Promise<CustomerAccountTokenSet | null> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await readSession(event, getSessionConfig(_shopify))

  if (!session?.data.user || !session.id) return null

  if (usesExternalTokenStorage(_shopify)) {
    return await getCustomerAccountTokenStorage(_shopify).getItem(session.id)
  }

  return session.data.tokens ?? null
}

/**
 * Reads the customer account session for the current request.
 *
 * @param event the current request event
 *
 * @returns resolved session data, logged in user and tokens if available
 */
export async function getCustomerAccountSession(event: H3Event): Promise<CustomerAccountSession> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await readSession(event, getSessionConfig(_shopify))

  return {
    loggedIn: !!session?.data.user,
    user: session?.data.user ?? null,
    loggedInAt: session?.data.loggedInAt ?? null,
  }
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
export async function requireCustomerAccountSession(event: H3Event): Promise<CustomerAccountSession> {
  const session = await getCustomerAccountSession(event)

  if (!session.user) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: '[shopify] No authenticated customer account session',
    })
  }

  return session
}

/**
 * Ends the customer account session and removes any stored tokens.
 *
 * @param event the current request event
 */
export async function clearCustomerAccountSession(event: H3Event): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await useSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  const id = session.id

  await session.clear()

  if (usesExternalTokenStorage(_shopify) && id) {
    await getCustomerAccountTokenStorage(_shopify).removeItem(id)
  }
}
