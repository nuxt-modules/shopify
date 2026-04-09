import type { CustomerAccountApiClient, CustomerAccountOperations } from '@nuxtjs/shopify/customer-account'

import { joinURL } from 'ufo'

import { useRuntimeConfig, useNuxtApp, useRequestURL } from '#imports'
import { useCookie } from '#app'
import { createClient } from '../../utils/client'
import { createCustomerAccountConfig } from '../../utils/clients/customer-account'
import useErrors from '../../utils/errors'

export function useCustomerAccount(): CustomerAccountApiClient {
  const { _shopify } = useRuntimeConfig().public

  const sessionCookie = useCookie('nuxt-session')

  const config = createCustomerAccountConfig(_shopify, {
    ...(sessionCookie.value ? { Cookie: `nuxt-session=${sessionCookie.value}` } : {}),
  })

  const nuxtApp = useNuxtApp()

  if (_shopify?.clients.customerAccount?.proxy && !nuxtApp.payload.prerenderedAt) {
    config.apiUrl = joinURL(useRequestURL().origin, _shopify.clients.customerAccount.proxy.path)
  }

  nuxtApp.hooks.callHook('customer-account:client:configure', { config })

  const originalClient = createClient<CustomerAccountOperations>(config)

  const request: CustomerAccountApiClient['request'] = async (operation, options) => {
    nuxtApp.hooks.callHook('customer-account:client:request', { operation, options })

    const response = await originalClient.request(operation, options)

    if (response.errors) useErrors(nuxtApp.hooks, 'customer-account:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nuxtApp.hooks.callHook('customer-account:client:response', { response, operation, options })

    return response
  }

  const client = { ...originalClient, request } satisfies CustomerAccountApiClient

  nuxtApp.hooks.callHook('customer-account:client:create', { client })

  return client
}
