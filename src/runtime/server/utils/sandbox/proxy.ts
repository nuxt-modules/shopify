import type { AdminOperations } from '@nuxtjs/shopify/admin'
import type { CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import type { ShopifyApiClient, ShopifyClientType } from '../../../../module'

import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { kebabCase } from 'scule'
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

  const clientType = event.path.split('?')[0]!.split('/').pop() as ShopifyClientType

  if (!_shopify) {
    throw createError({
      statusCode: 500,
      statusMessage: '[shopify] Failed to handle sandbox request: module configuration is missing',
    })
  }

  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  let client: ReturnType<typeof createClient>

  switch (kebabCase(clientType)) {
    case 'storefront':
      client = createClient(createStorefrontConfig(_shopify))

      return await client.request(body.query, { variables: body.variables })
    case 'customer-account':
      client = createClient(createCustomerAccountConfig(_shopify))

      return await withCustomerAccountCredentials(client as unknown as ShopifyApiClient<CustomerAccountOperations, undefined>, event)
        .then(client => client.request(body.query, { variables: body.variables }))
    case 'admin':
      client = createClient(createAdminConfig(_shopify))

      return await withAdminCredentials(client as unknown as ShopifyApiClient<AdminOperations, undefined>, _shopify)
        .then(client => client.request(body.query, { variables: body.variables }))
    default:
      throw createError({
        statusCode: 400,
        statusMessage: `[shopify] Failed to handle sandbox request: unsupported client type \`${clientType}\``,
      })
  }
})
