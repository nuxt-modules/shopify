import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createCustomerAccountClient } from '../../utils/clients/customer-account'

export function useCustomerAccount(event?: H3Event): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig().public

  const nuxtApp = useNuxtApp()

  return createCustomerAccountClient(_shopify!, {
    event: event ?? (import.meta.server ? useRequestEvent() : undefined),
    origin: nuxtApp.payload.prerenderedAt ? undefined : useRequestURL().origin,

    onConfigure: params => nuxtApp.hooks.callHook('customer-account:client:configure', params),
    onCreate: params => nuxtApp.hooks.callHook('customer-account:client:create', params),
    onRequest: params => nuxtApp.hooks.callHook('customer-account:client:request', params),
    onResponse: params => nuxtApp.hooks.callHook('customer-account:client:response', params),
    onErrors: params => nuxtApp.hooks.callHook('customer-account:client:errors', params),
  })
}
