import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { createError, useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createCustomerAccountApiClient } from '../../utils/clients/customer-account'
import { CUSTOMER_ACCOUNT_DISABLED_MESSAGE, isCustomerAccountEnabled } from '../../utils/session'

/**
 * Creates a Customer Account API client for the current request.
 *
 * @param event explicit H3 event, falls back to the current request event if not provided
 *
 * @returns a Customer Account API client instance
 */
export function useCustomerAccount(event?: H3Event): CustomerAccountApiClient {
  const { public: { _shopify } } = useRuntimeConfig()

  if (_shopify?.clients?.customerAccount && !isCustomerAccountEnabled(_shopify)) {
    throw createError({ status: 404, statusText: 'Not Found', message: CUSTOMER_ACCOUNT_DISABLED_MESSAGE })
  }

  const nuxtApp = useNuxtApp()

  const requestEvent = event ?? (import.meta.server ? useRequestEvent() : undefined)
  const serverContext = import.meta.server ? requestEvent?.context._shopify?.customerAccount : undefined

  return createCustomerAccountApiClient(_shopify!, {
    event: requestEvent,
    origin: import.meta.client ? useRequestURL().origin : undefined,

    ...(requestEvent && serverContext ? { auth: () => serverContext.getAccessToken(requestEvent) } : {}),

    onConfigure: params => nuxtApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:customer-account:client:configure', [params] as never),
    onCreate: params => nuxtApp.hooks.callHook('shopify:customer-account:client:create', params),
    onRequest: params => nuxtApp.hooks.callHook('shopify:customer-account:client:request', params),
    onResponse: params => nuxtApp.hooks.callHook('shopify:customer-account:client:response', params),
    onErrors: params => nuxtApp.hooks.callHook('shopify:customer-account:client:errors', params),
  })
}
