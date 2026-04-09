import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'
import type { H3Event } from 'h3'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'

import { createClient } from '../../../utils/client'
import { createCustomerAccountConfig } from '../../../utils/clients/customer-account'
import useErrors from '../../../utils/errors'
import { getCustomerAccountAccessToken } from './auth'

export function useCustomerAccount(event: H3Event): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig()

  const config = createCustomerAccountConfig(_shopify)

  const nitroApp = useNitroApp()

  nitroApp.hooks.callHook('customer-account:client:configure', { config })

  const originalClient = createClient<CustomerAccountOperations>(config)
  console.log('Customer Account API URL (client):', config.apiUrl)

  const request: CustomerAccountApiClient['request'] = async (operation, options) => {
    nitroApp.hooks.callHook('customer-account:client:request', { operation, options })

    const accessToken = await getCustomerAccountAccessToken(event)

    client.config.headers['Authorization'] = accessToken

    const response = await originalClient.request(operation, options)

    if (response.errors) useErrors(nitroApp.hooks, 'customer-account:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nitroApp.hooks.callHook('customer-account:client:response', { response, operation, options })

    return response
  }

  const client = { ...originalClient, request } satisfies CustomerAccountApiClient

  nitroApp.hooks.callHook('customer-account:client:create', { client })

  return client
}
