import type { CustomerAccountSession } from '../../../utils/customer-account/session'

import { defineEventHandler, setResponseHeader } from 'h3'

import { getCustomerAccountSession } from '../../../utils/customer-account/session'
import { getValidCustomerAccessToken } from '../../../utils/customer-account/auth'

export default defineEventHandler(async (event): Promise<CustomerAccountSession> => {
  setResponseHeader(event, 'cache-control', 'no-store')

  const session = await getCustomerAccountSession(event)

  if (!session.loggedIn) return session

  try {
    await getValidCustomerAccessToken(event)
  }
  catch {
    return { loggedIn: false, user: null, loggedInAt: null }
  }

  return session
})
