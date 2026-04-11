import type { H3Event } from 'h3'

import type { CustomerAccountOperations } from '../../../../clients/customer-account'
import type { ShopifyApiClient } from '../../../../types'

import { getUserSession } from '#imports'

export const withCustomerAccountCredentials = async <Operations extends CustomerAccountOperations, Cache extends undefined>(client: ShopifyApiClient<Operations, Cache>, event: H3Event): Promise<ShopifyApiClient<Operations, Cache>> => {
  const session = await getUserSession(event)

  const accessToken = session?.secure?.accessToken

  if (!accessToken) {
    throw new Error('[shopify] Failed to obtain customer account access token: No access token found in user session')
  }

  client.config.headers['Authorization'] = accessToken

  return client
}
