import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'
import type { H3Event } from 'h3'

import { useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createStorefrontApiClient } from '../../utils/clients/storefront'

/**
 * Creates a Storefront API client for the current request.
 *
 * @param event explicit H3 event, falls back to the current request event if not provided
 *
 * @returns a Storefront API client instance
 */
export function useStorefront(event?: H3Event): StorefrontApiClient<true> {
  const { public: { _shopify } } = useRuntimeConfig()

  const nuxtApp = useNuxtApp()

  const requestEvent = event ?? (import.meta.server ? useRequestEvent() : undefined)

  return createStorefrontApiClient<true>(_shopify!, {
    event: requestEvent,
    origin: import.meta.client ? useRequestURL().origin : undefined,
    browserCache: nuxtApp.$shopify?.cache?.storefront,
    serverCache: import.meta.server ? requestEvent?.context.shopifyStorefrontCache : undefined,

    onConfigure: params => nuxtApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:storefront:client:configure', [params] as never),
    onCreate: params => nuxtApp.hooks.callHook('shopify:storefront:client:create', params),
    onRequest: params => nuxtApp.hooks.callHook('shopify:storefront:client:request', params),
    onResponse: params => nuxtApp.hooks.callHook('shopify:storefront:client:response', params),
    onErrors: params => nuxtApp.hooks.callHook('shopify:storefront:client:errors', params),
  })
}
