import type { AdminApiClient } from '@nuxtjs/shopify/admin'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createAdminClient } from '../../../utils/clients/admin'

export function useAdmin(): AdminApiClient {
  const { _shopify } = useRuntimeConfig()

  const nitroApp = useNitroApp()

  return createAdminClient(_shopify!, {
    onConfigure: params => nitroApp.hooks.callHook('admin:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('admin:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('admin:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('admin:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('admin:client:errors', params),

    onAuthRequest: params => nitroApp.hooks.callHook('admin:auth:request', params),
    onAuthToken: ({ token, refresh }) => nitroApp.hooks.callHook(refresh ? 'admin:auth:refresh' : 'admin:auth:success', { token }),
    onAuthError: params => nitroApp.hooks.callHook('admin:auth:error', params),
  })
}
