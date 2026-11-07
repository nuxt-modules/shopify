import type { ShopifyCustomerAccountSession } from '../../../../module'

import { defineEventHandler, setResponseHeader } from 'h3'

import { getCustomerAccountSession } from '../../utils/customer-account/session'

export default defineEventHandler(async (event): Promise<ShopifyCustomerAccountSession> => {
  setResponseHeader(event, 'cache-control', 'no-store')

  return await getCustomerAccountSession(event)
})
