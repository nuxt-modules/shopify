import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'
import type { H3Event } from 'h3'

import type { ShopifyClientCallbacks } from '../../../../module'

import { useNitroApp } from 'nitropack/runtime'

import { useRuntimeConfig } from '#imports'
import { createStorefrontApiClient } from '../../../utils/clients/storefront'
import { tryUseEvent } from '../event'

export function createStorefrontCallbacks(): ShopifyClientCallbacks<StorefrontOperations> {
  const nitroApp = useNitroApp()

  return {
    onConfigure: params => nitroApp.hooks.callHookWith(hooks => hooks.forEach(hook => hook(params)), 'shopify:storefront:client:configure', params),
    onCreate: params => nitroApp.hooks.callHook('shopify:storefront:client:create', params),
    onRequest: params => nitroApp.hooks.callHook('shopify:storefront:client:request', params),
    onResponse: params => nitroApp.hooks.callHook('shopify:storefront:client:response', params),
    onErrors: params => nitroApp.hooks.callHook('shopify:storefront:client:errors', params),
  }
}

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

  return createStorefrontApiClient(_shopify!, { event, ...createStorefrontCallbacks() })
}
