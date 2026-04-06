import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createClient } from '../../../utils/client'
import { createAdminConfig } from '../../../utils/clients/admin'
import { getAdminAccessToken } from './auth'
import useErrors from '../../../utils/errors'
import { createError } from 'h3'

export async function useAdmin(): Promise<AdminApiClient> {
  const { _shopify } = useRuntimeConfig()

  const adminClientConfig = _shopify?.clients?.admin
  const shopName = _shopify?.name

  if (!shopName || !adminClientConfig) {
    throw createError({
      statusCode: 500,
      message: '[shopify] Could not create admin client: missing shop name or admin config',
    })
  }

  const accessToken = await getAdminAccessToken(shopName, adminClientConfig, adminClientConfig.tokenStorage !== false)

  const config = createAdminConfig(_shopify, accessToken)

  const nitroApp = useNitroApp()

  nitroApp.hooks.callHook('admin:client:configure', { config })

  const originalClient = createClient<AdminOperations>(config)

  const request: AdminApiClient['request'] = async (operation, options) => {
    nitroApp.hooks.callHook('admin:client:request', { operation, options })

    const response = await originalClient.request(operation, options)

    if (response.errors) useErrors(nitroApp.hooks, 'admin:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nitroApp.hooks.callHook('admin:client:response', { response, operation, options })

    return response
  }

  const client = { ...originalClient, request } satisfies AdminApiClient

  nitroApp.hooks.callHook('admin:client:create', { client })

  return client
}
