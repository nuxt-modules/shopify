import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'

import { useRuntimeConfig, useNuxtApp } from '#imports'
import { createClient } from '../../utils/client'
import { createCustomerAccountConfig, withCustomerAccountCredentials } from '../../utils/clients/customer-account'
import useErrors from '../../utils/errors'

export function useCustomerAccount(): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig().public

  const config = createCustomerAccountConfig(_shopify)

  const nuxtApp = useNuxtApp()

  nuxtApp.hooks.callHook('customer-account:client:configure', { config })

  const originalClient = createClient<CustomerAccountOperations>(config)

  const request: CustomerAccountApiClient['request'] = async (operation, options) => {
    nuxtApp.hooks.callHook('customer-account:client:request', { operation, options })

    const response = await withCustomerAccountCredentials(originalClient).then(client => client.request(operation, options))

    if (response.errors) useErrors(nuxtApp.hooks, 'customer-account:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nuxtApp.hooks.callHook('customer-account:client:response', { response, operation, options })

    return response
  }

  const client = { ...originalClient, request } satisfies CustomerAccountApiClient

  nuxtApp.hooks.callHook('customer-account:client:create', { client })

  return client
}
