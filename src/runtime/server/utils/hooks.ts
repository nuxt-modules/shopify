import type { NitroApp } from 'nitropack/types'

import type { ShopifyClientOptionHookParams } from '../../../module'

type ConfigureHookName = 'shopify:storefront:client:configure' | 'shopify:customer-account:client:configure' | 'shopify:admin:client:configure'

type ConfigureCallback = (params: ShopifyClientOptionHookParams) => unknown

/**
 * Calls every callback of a client's `configure` hook synchronously, so their changes apply before the client is
 * created and a callback that throws stops it from being created.
 *
 * Nitro v2's `callHook` only runs the callbacks after a microtask, so they're called through `callHookWith`. Nitro v3
 * has no `callHookWith`, and its `callHook` waits for a callback that returns a promise before calling the next one
 * and turns a throw into a rejection, so its callbacks are read from the hooks directly.
 */
export function callConfigureHook(nitroApp: NitroApp, name: ConfigureHookName, params: ShopifyClientOptionHookParams) {
  const hooks = nitroApp.hooks
  const call = (callbacks: ConfigureCallback[]) => callbacks.forEach(callback => callback(params))

  if (typeof hooks.callHookWith === 'function') hooks.callHookWith(call, name, params)
  else call([...(hooks as unknown as { _hooks: Record<string, ConfigureCallback[] | undefined> })._hooks[name] ?? []])
}
