import { createError, defineEventHandler, getRouterParam, setResponseHeader } from 'h3'

import { useRuntimeConfig } from '#imports'
import { assertSameSite } from '../../utils/csrf'
import { readGraphqlBody } from '../../utils/graphql'
import { createCustomerAccountConfig } from '../../../utils/clients/customer-account'
import { DEFAULT_API_VERSION, isApiVersion } from '../../../utils/clients/defaults'
import { createUpstreamError, resolveStatus } from '../../../utils/clients/errors'
import { withApiVersion } from '../../../utils/clients/transport'
import { getValidCustomerAccessToken } from '../../utils/customer-account/auth'

export default defineEventHandler(async (event) => {
  assertSameSite(event)

  const apiVersion = getRouterParam(event, 'version')

  if (!apiVersion || !isApiVersion(apiVersion)) {
    throw createError({
      status: 400,
      statusText: 'Bad Request',
      message: `[shopify] Malformed API version "${apiVersion}". Expected a quarterly version such as "${DEFAULT_API_VERSION}", or "unstable"`,
    })
  }

  const body = await readGraphqlBody(event)

  const { _shopify } = useRuntimeConfig(event)

  const { apiUrl } = createCustomerAccountConfig(_shopify)

  const accessToken = await getValidCustomerAccessToken(event)

  setResponseHeader(event, 'cache-control', 'private, no-store')

  return await $fetch<object>(withApiVersion(apiUrl, apiVersion), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': accessToken,
    },
    body,
  }).catch((error) => {
    throw createUpstreamError(resolveStatus(error.status), `The Customer Account API rejected the request: ${error.message}${error.data === undefined ? '' : ` ${JSON.stringify(error.data)}`}`, error, _shopify?.logger)
  })
})
