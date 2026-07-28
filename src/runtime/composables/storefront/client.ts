import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'

import { useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createStorefrontClient } from '../../utils/clients/storefront'

export function useStorefront(): StorefrontApiClient<true> {
  const { _shopify } = useRuntimeConfig().public

  const nuxtApp = useNuxtApp()

  return createStorefrontClient<true>(_shopify!, {
    event: import.meta.server ? useRequestEvent() : undefined,
    origin: nuxtApp.payload.prerenderedAt ? undefined : useRequestURL().origin,
    cache: nuxtApp.$shopify?.cache?.storefront,

    onConfigure: params => nuxtApp.hooks.callHook('storefront:client:configure', params),
    onCreate: params => nuxtApp.hooks.callHook('storefront:client:create', params),
    onRequest: params => nuxtApp.hooks.callHook('storefront:client:request', params),
    onResponse: params => nuxtApp.hooks.callHook('storefront:client:response', params),
    onErrors: params => nuxtApp.hooks.callHook('storefront:client:errors', params),
  })
}
