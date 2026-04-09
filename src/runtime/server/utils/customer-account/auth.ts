import type { H3Event } from 'h3'

import { getUserSession } from '#imports'

export async function getCustomerAccountAccessToken(event: H3Event): Promise<string> {
  const session = await getUserSession(event)

  const accessToken = session?.secure?.accessToken

  if (!accessToken) {
    throw new Error('[shopify] Failed to obtain customer account access token: No access token found in user session')
  }

  return accessToken
}
