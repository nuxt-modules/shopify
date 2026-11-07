import type { H3Event } from 'h3'

import { createError, getRequestHeader, readValidatedBody } from 'h3'
import { z } from 'zod'

const graphqlBodySchema = z.object({
  query: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
  operationName: z.string().nullish(),
})

function isJsonRequest(event: H3Event): boolean {
  return getRequestHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

export async function readGraphqlBody(event: H3Event) {
  if (!isJsonRequest(event)) {
    throw createError({
      status: 415,
      statusText: 'Unsupported Media Type',
      message: '[shopify] GraphQL requests must be sent as `application/json`',
    })
  }

  return await readValidatedBody(event, graphqlBodySchema.parse)
}
