import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createCustomerAccountApiClient } from '../../../utils/clients/customer-account'
import { tryUseEvent } from '../event'
import { getValidCustomerAccessToken } from './auth'

/**
 * Creates a Customer Account API client for the current request.
 *
 * @param event the request event. Pass it in server routes: without it, the client only finds the current request
 * with Nitro's `experimental.asyncContext` and otherwise uses the build-time config without the request's cookies or
 * customer session
 *
 * @returns a Customer Account API client instance
 */
export function useCustomerAccount(event?: H3Event): CustomerAccountApiClient {
  event ??= tryUseEvent()

  const { _shopify } = useRuntimeConfig(event)

  const nitroApp = useNitroApp()

  return createCustomerAccountApiClient(_shopify!, {
    event,

    auth: () => getValidCustomerAccessToken(event),

    onConfigure: params => nitroApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:customer-account:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('shopify:customer-account:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('shopify:customer-account:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('shopify:customer-account:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('shopify:customer-account:client:errors', params),
  })
}
