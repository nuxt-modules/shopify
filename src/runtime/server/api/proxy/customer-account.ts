import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

import { useRuntimeConfig } from '#imports'
import { createCustomerAccountConfig } from '../../../utils/clients/customer-account'
import { getValidCustomerAccessToken } from '../../utils/customer-account/auth'

export default defineEventHandler(async (event) => {
  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  const { _shopify } = useRuntimeConfig()

  const { apiUrl } = createCustomerAccountConfig(_shopify)

  const accessToken = await getValidCustomerAccessToken(event)

  return await $fetch(apiUrl, {
    method: event.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': accessToken,
    },
    body,
  })
})
