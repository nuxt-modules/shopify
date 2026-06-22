import type { CustomerAccountSession } from '../../../utils/customer-account/session'

import { defineEventHandler } from 'h3'

import { getCustomerAccountSession } from '../../../utils/customer-account/session'

export default defineEventHandler(async (event): Promise<CustomerAccountSession> => {
  return await getCustomerAccountSession(event)
})
