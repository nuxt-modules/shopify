import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'
import type { H3Event } from 'h3'

import { useNitroApp } from 'nitropack/runtime'

import { useRuntimeConfig } from '#imports'
import { createStorefrontApiClient } from '../../../utils/clients/storefront'
import { tryUseEvent } from '../event'

/**
 * Creates a Storefront API client for the current request.
 *
 * @param event the request event. Pass it in server routes: without it, the client only finds the current request
 * with Nitro's `experimental.asyncContext` and otherwise uses the build-time config without the request's cookies or
 * the buyer's IP address
 *
 * @returns a Storefront API client instance
 */
export function useStorefront(event?: H3Event): StorefrontApiClient {
  event ??= tryUseEvent()

  const { _shopify } = useRuntimeConfig(event)

  const nitroApp = useNitroApp()

  return createStorefrontApiClient(_shopify!, {
    event,

    onConfigure: params => nitroApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:storefront:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('shopify:storefront:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('shopify:storefront:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('shopify:storefront:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('shopify:storefront:client:errors', params),
  })
}
