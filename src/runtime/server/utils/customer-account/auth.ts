import type { H3Event } from 'h3'

import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { ShopifyApiClient } from '../../../../module'
import type { CustomerAccountSessionData, CustomerAccountTokenSet } from './session'

import { createError, getSession } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createStoreDomain } from '../../../utils/client'
import { getCustomerAccountTokenStorage, getSessionConfig } from './session'
import { getOpenIdConfiguration, refreshAccessToken } from '../../../utils/customer-account/oauth'

const EXPIRY_THRESHOLD_MS = 5 * 60 * 1000

const pendingRefreshRequests = new Map<string, Promise<CustomerAccountTokenSet>>()

function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false

  return Date.now() >= expiresAt - EXPIRY_THRESHOLD_MS
}

export async function getValidCustomerAccessToken(event: H3Event): Promise<string> {
  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount) {
    throw createError({ statusCode: 500, message: '[shopify] Customer account client is not configured' })
  }

  const session = await getSession<CustomerAccountSessionData>(event, getSessionConfig(_shopify))

  if (!session.data.user || !session.id) {
    throw createError({ statusCode: 401, message: '[shopify] No authenticated customer account session' })
  }

  const id = session.id
  const storage = getCustomerAccountTokenStorage(_shopify)

  const tokens = await storage.getItem(id)

  if (!tokens?.accessToken) {
    throw createError({ statusCode: 401, message: '[shopify] Customer account session expired' })
  }

  if (!isExpired(tokens.expiresAt)) {
    return tokens.accessToken
  }

  if (!tokens.refreshToken) {
    throw createError({ statusCode: 401, message: '[shopify] Customer account session expired' })
  }

  if (!pendingRefreshRequests.has(id)) {
    const refreshToken = tokens.refreshToken

    const request = getOpenIdConfiguration(createStoreDomain(_shopify.name))
      .then(configuration => refreshAccessToken(configuration, {
        clientId: customerAccount.clientId,
        clientSecret: customerAccount.clientSecret,
        refreshToken,
      }))
      .then(async (fresh) => {
        const next: CustomerAccountTokenSet = {
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token ?? refreshToken,
          idToken: fresh.id_token ?? tokens.idToken,
          expiresAt: Date.now() + (fresh.expires_in ?? 7200) * 1000,
        }

        await storage.setItem(id, next)

        await useNitroApp().hooks.callHook('customer-account:auth:refresh', { tokens: next })

        return next
      })
      .finally(() => pendingRefreshRequests.delete(id))

    pendingRefreshRequests.set(id, request)
  }

  const refreshed = await pendingRefreshRequests.get(id)!.catch((error) => {
    console.error('[shopify] Failed to refresh the customer account session:', error)

    throw createError({ statusCode: 401, statusMessage: '[shopify] Customer account session expired' })
  })

  return refreshed.accessToken
}

export const withCustomerAccountCredentials = async <Operations extends CustomerAccountOperations, Cache extends undefined>(client: ShopifyApiClient<Operations, Cache>, event: H3Event): Promise<ShopifyApiClient<Operations, Cache>> => {
  client.config.headers['Authorization'] = await getValidCustomerAccessToken(event)

  return client
}
