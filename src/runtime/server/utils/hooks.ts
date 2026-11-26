import type { NitroApp } from 'nitropack/types'

import type { ShopifyClientOptionHookParams } from '../../../module'

type ConfigureHookName = 'shopify:storefront:client:configure' | 'shopify:customer-account:client:configure' | 'shopify:admin:client:configure'

/**
 * Calls a client's `configure` hook synchronously, so its changes apply before the client is created.
 *
 * Nitro v2's `callHook` always runs the hooks after a microtask, so they're called through `callHookWith` instead.
 * Nitro v3 has no `callHookWith`, but its `callHook` runs synchronous hooks right away.
 */
export function callConfigureHook(nitroApp: NitroApp, name: ConfigureHookName, params: ShopifyClientOptionHookParams) {
  const hooks = nitroApp.hooks

  if (typeof hooks.callHookWith === 'function') hooks.callHookWith(callbacks => callbacks.forEach(callback => callback(params)), name, params)
  else hooks.callHook(name, params)
}
