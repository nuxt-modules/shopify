import type { H3Event, SessionConfig } from 'h3'
import type { Storage } from 'unstorage'

import type { CustomerAccountSession, CustomerAccountSessionData, CustomerAccountTokenSet, CustomerAccountUser, ShopifyConfig } from '../../../../module'

import { createError, getSession, useSession } from 'h3'
import { useStorage } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

export type { CustomerAccountSession, CustomerAccountSessionData, CustomerAccountTokenSet, CustomerAccountUser } from '../../../../module'

export function getSessionConfig(config?: ShopifyConfig): SessionConfig {
  const session = config?.clients?.customerAccount?.session

  if (!session?.password) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to resolve the customer account session: no session password configured. '
        + 'Set `shopify.clients.customerAccount.session.password` or the '
        + '`NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD` environment variable.',
    })
  }

  return {
    name: session.name,
    password: session.password,
    maxAge: session.maxAge,
    cookie: {
      sameSite: 'lax',
      secure: !import.meta.dev,
      ...session.cookie,
      httpOnly: true,
    },
  }
}

export function getCustomerAccountTokenStorage(config?: ShopifyConfig): Storage<CustomerAccountTokenSet> {
  const tokenStorage = config?.clients?.customerAccount?.tokenStorage

  const base = typeof tokenStorage === 'string' ? tokenStorage : 'customer-account-token'

  return useStorage<CustomerAccountTokenSet>(base)
}

export async function getCustomerAccountSession(event: H3Event): Promise<CustomerAccountSession> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await getSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  return {
    loggedIn: !!session.data.user,
    user: session.data.user ?? null,
    loggedInAt: session.data.loggedInAt ?? null,
  }
}

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

export async function setCustomerAccountSession(event: H3Event, data: { user: CustomerAccountUser, tokens: CustomerAccountTokenSet, loggedInAt: number }): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await useSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  await session.update({ user: data.user, loggedInAt: data.loggedInAt })

  await getCustomerAccountTokenStorage(_shopify).setItem(session.id!, data.tokens)
}

export async function getCustomerAccountTokens(event: H3Event): Promise<CustomerAccountTokenSet | null> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await getSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  if (!session.data.user || !session.id) return null

  return await getCustomerAccountTokenStorage(_shopify).getItem(session.id)
}

export async function clearCustomerAccountSession(event: H3Event): Promise<void> {
  const { _shopify } = useRuntimeConfig(event)

  const session = await useSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  const id = session.id

  await session.clear()

  if (id) {
    await getCustomerAccountTokenStorage(_shopify).removeItem(id)
  }
}
