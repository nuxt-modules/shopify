import type { H3Event } from 'h3'

import type { ShopifyClientType } from '../../../../module'

import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { kebabCase } from 'scule'
import { useRuntimeConfig } from '#imports'
import { z } from 'zod'

import { assertSameSite } from '../csrf'
import { createShopifyClient } from '../../../utils/clients'
import { getValidCustomerAccessToken } from '../customer-account/auth'

export default defineEventHandler(async (event: H3Event) => {
  if (!import.meta.dev) return

  assertSameSite(event)

  const { _shopify } = useRuntimeConfig(event)

  const clientType = event.path.split('?')[0]!.split('/').pop() as ShopifyClientType

  if (!_shopify) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to handle explorer request: module configuration is missing',
    })
  }

  const schema = z.object({
    query: z.string(),
    variables: z.record(z.string(), z.unknown()).optional(),
  })

  const body = await readValidatedBody(event, schema.parse)

  let client: ReturnType<typeof createShopifyClient>

  switch (kebabCase(clientType)) {
    case 'storefront':
      client = createShopifyClient(_shopify, {
        client: 'storefront',
        throwOnErrors: false,
      })

      break
    case 'customer-account':
      client = createShopifyClient(_shopify, {
        client: 'customerAccount',
        auth: () => getValidCustomerAccessToken(event),
        throwOnErrors: false,
      })

      break
    case 'admin':
      client = createShopifyClient(_shopify, {
        client: 'admin',
        throwOnErrors: false,
      })

      break
    default:
      throw createError({
        status: 400,
        statusText: 'Bad Request',
        message: `[shopify] Failed to handle explorer request: unsupported client type \`${clientType}\``,
      })
  }

  const { data, errors, extensions } = await client.request(body.query, { variables: body.variables })

  return {
    ...(data ? { data } : {}),
    ...(errors ? { errors: errors.graphQLErrors ?? [{ message: errors.message }] } : {}),
    ...(extensions ? { extensions } : {}),
  }
})
