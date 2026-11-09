import type { H3Event } from 'h3'

import type { ShopifyCustomerAccountContext } from '../../../../module'

import { createError } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { getShopifyRequestContext } from '../routes'
import { createCustomerSessionManager, getCustomerAccountSession, getHydrogenCustomerSession } from './session'

export async function getValidCustomerAccessToken(event?: H3Event): Promise<string> {
  if (!event) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Request event is not available' })
  }

  const { _shopify } = useRuntimeConfig(event)

  const customerSession = getHydrogenCustomerSession(_shopify)
  const sessionManager = createCustomerSessionManager(event)
  const requestContext = await getShopifyRequestContext(event)

  const usableAccessToken = await customerSession.getAccessToken(sessionManager, requestContext)
  const accessToken = usableAccessToken ?? await customerSession.getOrRefreshAccessToken(sessionManager, requestContext)

  if (!accessToken) {
    throw createError({ status: 401, statusText: 'Unauthorized', message: '[shopify] No customer account session: the customer is not logged in' })
  }

  if (!usableAccessToken) await useNitroApp().hooks.callHook('shopify:customer-account:auth:refresh', { event })

  return accessToken
}

export const customerAccountContext: ShopifyCustomerAccountContext = {
  getSession: getCustomerAccountSession,
  getAccessToken: getValidCustomerAccessToken,
}
