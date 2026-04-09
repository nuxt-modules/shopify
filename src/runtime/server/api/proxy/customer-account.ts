import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

import { useRuntimeConfig, getUserSession } from '#imports'
import { createCustomerAccountConfig } from '../../../utils/clients/customer-account'

export default defineEventHandler(async (event) => {
  console.log('Received request to /_proxy/customer-account')

  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  const { _shopify } = useRuntimeConfig()

  const { apiUrl } = createCustomerAccountConfig(_shopify)

  const session = await getUserSession(event)

  const accessToken = session?.secure?.accessToken

  return await $fetch(apiUrl, {
    method: event.method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: accessToken } : {}),
    },
    body,
  })
})
