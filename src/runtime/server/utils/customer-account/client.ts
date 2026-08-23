import type { CustomerAccountApiClient } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { useEvent, useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createCustomerAccountClient } from '../../../utils/clients/customer-account'
import { getValidCustomerAccessToken } from './auth'

/**
 * Creates a Customer Account API client for the current request.
 *
 * @param event explicit H3 event, falls back to the current request event if not provided
 *
 * @returns a Customer Account API client instance
 */
export function useCustomerAccount(event?: H3Event): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig(event)

  const nitroApp = useNitroApp()

  return createCustomerAccountClient(_shopify!, {
    auth: () => getValidCustomerAccessToken(event ?? useEvent()),

    onConfigure: params => nitroApp.hooks.callHook('customer-account:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('customer-account:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('customer-account:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('customer-account:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('customer-account:client:errors', params),
  })
}
