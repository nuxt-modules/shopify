import type { H3Event } from 'h3'

import { Kind, parse, print } from 'graphql'
import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

import { assertSameSite } from '../../utils/csrf'
import { readGraphqlBody } from '../../utils/graphql'
import { createAdminApiClient } from '../../../utils/clients/admin'

export default defineEventHandler(async (event: H3Event) => {
  if (!import.meta.dev) return

  assertSameSite(event)

  const { _shopify } = useRuntimeConfig(event)

  if (!_shopify) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to handle explorer request: module configuration is missing',
    })
  }

  const { query, variables, operationName } = await readGraphqlBody(event)

  const document = operationName ? parse(query) : undefined

  const operation = document
    ? print({ ...document, definitions: document.definitions.filter(definition => definition.kind !== Kind.OPERATION_DEFINITION || definition.name?.value === operationName) })
    : query

  const { data, errors, extensions } = await createAdminApiClient(_shopify, { throwOnErrors: false })
    .request(operation, { variables })

  return {
    ...(data ? { data } : {}),
    ...(errors ? { errors: errors.graphQLErrors ?? [{ message: errors.message }] } : {}),
    ...(extensions ? { extensions } : {}),
  }
})
