import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createCustomerAccountClient } from '../../../utils/clients/customer-account'
import { getValidCustomerAccessToken } from './auth'

export function useCustomerAccount(event: H3Event): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig()

  const nitroApp = useNitroApp()

  return createCustomerAccountClient(_shopify!, {
    auth: () => getValidCustomerAccessToken(event),

    onConfigure: params => nitroApp.hooks.callHook('customer-account:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('customer-account:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('customer-account:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('customer-account:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('customer-account:client:errors', params),
  })
}
