import { createError, defineEventHandler, getRouterParam } from 'h3'

import { useRuntimeConfig } from '#imports'
import { API_VERSION_PATTERN } from '../../utils/clients/defaults'
import { PROXY_API_VERSION_HEADER, PUBLIC_TOKEN_HEADER } from '../../utils/clients/transport'
import storefrontProxy from './proxy/storefront'

export default defineEventHandler((event) => {
  const version = getRouterParam(event, 'version')

  if (!version || !API_VERSION_PATTERN.test(version)) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const publicAccessToken = useRuntimeConfig(event)._shopify?.clients.storefront?.publicAccessToken

  if (!publicAccessToken) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const headers = event.node.req.headers

  headers[PROXY_API_VERSION_HEADER.toLowerCase()] = version
  headers[PUBLIC_TOKEN_HEADER.toLowerCase()] = publicAccessToken

  return storefrontProxy(event)
})
