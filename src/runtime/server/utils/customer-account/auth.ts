import type { H3Event } from 'h3'

import type { CustomerAccountTokenSet } from './session'

import { createError } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createStoreDomain } from '../../../utils/clients/transport'
import { createLogger } from '../log'
import { clearCustomerAccountSession, getCustomerAccountTokens, setCustomerAccountTokens } from './session'
import { getOpenIdConfiguration, refreshAccessToken } from '../../../utils/clients/customer-account/auth'

const EXPIRY_THRESHOLD_MS = 5 * 60 * 1000

const pendingRefreshRequests = new Map<string, Promise<CustomerAccountTokenSet>>()

function unauthorized(reason: string): ReturnType<typeof createError> {
  return createError({ status: 401, statusText: 'Unauthorized', message: `[shopify] ${reason}` })
}

function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false

  return Date.now() >= expiresAt - EXPIRY_THRESHOLD_MS
}

export async function getValidCustomerAccessToken(event?: H3Event): Promise<string> {
  if (!event) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Request event is not available' })
  }

  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  const tokens = await getCustomerAccountTokens(event)

  if (!tokens?.accessToken) {
    throw unauthorized('No customer account session: the customer is not logged in')
  }

  if (!isExpired(tokens.expiresAt)) {
    return tokens.accessToken
  }

  if (!tokens.refreshToken) {
    throw unauthorized('Customer account session expired and cannot be refreshed: no refresh token is stored')
  }

  const refreshToken = tokens.refreshToken

  if (!pendingRefreshRequests.has(refreshToken)) {
    createLogger().debug('Refreshing expired customer account access token')

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

        await useNitroApp().hooks.callHook('customer-account:auth:refresh', { tokens: next })

        return next
      })
      .finally(() => pendingRefreshRequests.delete(refreshToken))

    pendingRefreshRequests.set(refreshToken, request)
  }

  const refreshed = await pendingRefreshRequests.get(refreshToken)!.catch(async (error) => {
    createLogger().error('Failed to refresh the customer account session:', error)

    await clearCustomerAccountSession(event).catch(() => {})

    throw unauthorized('Customer account session expired: refreshing the access token failed')
  })

  await setCustomerAccountTokens(event, refreshed)

  return refreshed.accessToken
}
