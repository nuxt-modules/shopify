import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createStorefrontClient } from '../../../utils/clients/storefront'

export function useStorefront(): StorefrontApiClient {
  const { _shopify } = useRuntimeConfig()

  const nitroApp = useNitroApp()

  return createStorefrontClient(_shopify!, {
    onConfigure: params => nitroApp.hooks.callHook('storefront:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('storefront:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('storefront:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('storefront:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('storefront:client:errors', params),
  })
}
