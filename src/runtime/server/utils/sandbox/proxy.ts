import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import type { ShopifyApiClient, ShopifyClientType } from '../../../../types'

import { defineEventHandler, readValidatedBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { z } from 'zod'

import { createAdminConfig } from '../../../utils/clients/admin'
import { createCustomerAccountConfig } from '../../..//utils/clients/customer-account'
import { createStorefrontConfig } from '../../../utils/clients/storefront'
import { withCustomerAccountCredentials } from '../customer-account/auth'
import { withAdminCredentials } from '../admin/auth'
import { createClient } from '../../../utils/client'

export default defineEventHandler(async (event: H3Event) => {
  if (!import.meta.dev) return

  const { _shopify } = useRuntimeConfig()

  const clientType = event.path.split('/').pop() as ShopifyClientType

  if (!_shopify) throw new Error('[shopify] Sandbox setup error: Module configuration is missing')

  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  let client: ReturnType<typeof createClient>

  switch (clientType) {
    case 'storefront':
      client = createClient(createStorefrontConfig(_shopify))

      return await client.request(body.query, { variables: body.variables })
    case 'customerAccount':
      client = createClient(createCustomerAccountConfig(_shopify))

      return await withCustomerAccountCredentials(client as unknown as ShopifyApiClient<CustomerAccountOperations, undefined>, event)
        .then(client => client.request(body.query, { variables: body.variables }))
    case 'admin':
      client = createClient(createAdminConfig(_shopify))

      return await withAdminCredentials(client as unknown as ShopifyApiClient<AdminOperations, undefined>, _shopify)
        .then(client => client.request(body.query, { variables: body.variables }))
    default:
      throw new Error('[shopify] Sandbox error: The requested client is not supported')
  }
})
