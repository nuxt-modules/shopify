import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'
import type { H3Event } from 'h3'

import { useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createStorefrontClient } from '../../utils/clients/storefront'

/**
 * Creates a Storefront API client for the current request.
 *
 * @param event explicit H3 event, falls back to the current request event if not provided
 *
 * @returns a Storefront API client instance
 */
export function useStorefront(event?: H3Event): StorefrontApiClient<true> {
  const { _shopify } = useRuntimeConfig().public

  const nuxtApp = useNuxtApp()

  return createStorefrontClient<true>(_shopify!, {
    event: event ?? (import.meta.server ? useRequestEvent() : undefined),
    origin: nuxtApp.payload.prerenderedAt ? undefined : useRequestURL().origin,
    cache: nuxtApp.$shopify?.cache?.storefront,

    onConfigure: params => nuxtApp.hooks.callHook('storefront:client:configure', params),
    onCreate: params => nuxtApp.hooks.callHook('storefront:client:create', params),
    onRequest: params => nuxtApp.hooks.callHook('storefront:client:request', params),
    onResponse: params => nuxtApp.hooks.callHook('storefront:client:response', params),
    onErrors: params => nuxtApp.hooks.callHook('storefront:client:errors', params),
  })
}
