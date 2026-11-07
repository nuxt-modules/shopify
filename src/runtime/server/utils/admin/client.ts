import type { AdminApiClient } from '@nuxtjs/shopify/admin'
import type { H3Event } from 'h3'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createAdminApiClient } from '../../../utils/clients/admin'
import { tryUseEvent } from '../event'

/**
 * Creates an Admin API client for the current request.
 *
 * @param event the request event. Pass it in server routes: without it, the client only finds the current request
 * with Nitro's `experimental.asyncContext` and otherwise uses the build-time config
 *
 * @returns an Admin API client instance
 */
export function useAdmin(event?: H3Event): AdminApiClient {
  event ??= tryUseEvent()

  const { _shopify } = useRuntimeConfig(event)

  const nitroApp = useNitroApp()

  return createAdminApiClient(_shopify!, {
    event,

    onConfigure: params => nitroApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:admin:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('shopify:admin:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('shopify:admin:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('shopify:admin:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('shopify:admin:client:errors', params),

    onAuthRequest: params => nitroApp.hooks.callHook('shopify:admin:auth:request', params),
    onAuthToken: ({ token, refresh }) => nitroApp.hooks.callHook(refresh ? 'shopify:admin:auth:refresh' : 'shopify:admin:auth:success', { token }),
    onAuthError: params => nitroApp.hooks.callHook('shopify:admin:auth:error', params),
  })
}
